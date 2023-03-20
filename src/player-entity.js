import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import * as nipplejs from 'https://cdnjs.cloudflare.com/ajax/libs/nipplejs/0.10.1/nipplejs.min.js';

import { FBXLoader } from 'https://unpkg.com/three@0.150.1/examples/jsm/loaders/FBXLoader.js';
//import { Capsule } from './Capsule.js';
//import { Octree } from 'https://unpkg.com/three@0.150.1/examples/jsm/math/Octree.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.150.1/examples/jsm/loaders/GLTFLoader.js';

import { entity } from './entity.js';
import { finite_state_machine } from './finite-state-machine.js';
import { player_state } from './player-state.js';
import Input from '/Input';

export const player_entity = (() => {

  class CharacterFSM extends finite_state_machine.FiniteStateMachine {
    constructor(proxy) {
      super();
      this._proxy = proxy;
      this._Init();
    }

    _Init() {
      this._AddState('idle', player_state.IdleState);
      this._AddState('walk', player_state.WalkState);
      this._AddState('walkBack', player_state.WalkBackState);
      this._AddState('run', player_state.RunState);
      this._AddState('jump', player_state.JumpState);
    }
  };

  class BasicCharacterControllerProxy {
    constructor(animations) {
      this._animations = animations;
    }

    get animations() {
      return this._animations;
    }
  };


  class BasicCharacterController extends entity.Component {
    constructor(params) {
      super();
      this._Init(params);
    }

    _Init(params) {
      this._params = params;
      this.xValue = 0;
      this.yValue = 0;
      this.GRAVITY = 80;

      this._animations = {};
      this._stateMachine = new CharacterFSM(
        new BasicCharacterControllerProxy(this._animations));

      this._LoadModels();
      this._addJoystick();
    }

    _addJoystick() {
      this.xValue = 0;
      this.yValue = 0;

      const options = {
        zone: document.getElementById('joystickWrapper'),
        size: 120,
        multitouch: true,
        mode: 'static',
        restJoystick: true,
        shape: 'circle',
        position: { bottom: '90px', left: '90px' },
        dynamicPage: true,
      }

      let joyManager = nipplejs.create(options);
      joyManager.on('move', (evt, data) => {
        console.log(data);
        this.xValue = data.vector.x;
        this.yValue = data.vector.y;
      });

      joyManager.on('end', () => {
        this.xValue = 0;
        this.yValue = 0;
      });
    }

    _LoadModels() {
      const loader = new FBXLoader();
      loader.setPath('/models/guard/');
      loader.load('Boy.fbx', (fbx) => {
        this._target = fbx;
        this._target.scale.setScalar(0.035);
        this._params.scene.add(this._target);

        this._target.traverse(c => {
          c.castShadow = true;
          //c.receiveShadow = true;
          if (c.material && c.material.map) {
            c.material.map.encoding = THREE.sRGBEncoding;
          }
        });

        this.Broadcast({
          topic: 'load.character',
          model: this._target,
        });

        this._mixer = new THREE.AnimationMixer(this._target);

        const _OnLoad = (animName, anim) => {
          const clip = anim.animations[0];
          const action = this._mixer.clipAction(clip);

          this._animations[animName] = {
            clip: clip,
            action: action,
          };
        };

        this._manager = new THREE.LoadingManager();
        this._manager.onLoad = () => {
          this._stateMachine.SetState('idle');
        };

        const loader = new FBXLoader(this._manager);
        loader.setPath('/models/guard/');
        loader.load('Idle.fbx', (a) => { _OnLoad('idle', a); });
        loader.load('Walking.fbx', (a) => { _OnLoad('walk', a); });
        loader.load('WalkingBackwards.fbx', (a) => { _OnLoad('walkBack', a); });
        loader.load('Running.fbx', (a) => { _OnLoad('run', a); });
        loader.load('Jump.fbx', (a) => { _OnLoad('jump', a); });
      });

      this.playerCollider = new Capsule(new THREE.Vector3(0, 0.35, 0), new THREE.Vector3(0, 1, 0), 0.35);
      this.playerVelocity = new THREE.Vector3();
      this.playerDirection = new THREE.Vector3();
      this.playerOnFloor = false;
      this.worldOctree = new Octree();

      const loader2 = new GLTFLoader();
      loader2.setPath('/models/');
      loader2.load('Navmesh.glb', (gltf) => {

        this._params.scene.add(gltf.scene);

        this.worldOctree.fromGraphNode(gltf.scene);

        gltf.scene.traverse(child => {
          if (child.isMesh) {
            child.material.visible = false;
          }
        });
      });
    }

    Update(timeInSeconds) {
      if (!this._stateMachine._currentState) {
        return;
      }

      let state = 0; // Idle
      if (this.yValue > 0.1 || Math.abs(this.xValue) > 0.1)
        state = 1; // Walking
      if (this.yValue > 0.5)
        state = 2; // Running
      if (this.yValue < -0.1)
        state = 3; // Walking Backwards

      this._stateMachine.Update(timeInSeconds, state);

      // if (state == 2) {
      //   const spawner = this.FindEntity('level-up-spawner').GetComponent('LevelUpComponentSpawner');
      //   spawner.Spawn(this._parent._position);
      // }

      if (this._mixer) {
        this._mixer.update(timeInSeconds);
      }

      // HARDCODED
      if (this._stateMachine._currentState._action) {
        this.Broadcast({
          topic: 'player.action',
          action: this._stateMachine._currentState.Name,
          time: this._stateMachine._currentState._action.time,
        });
      }

      const controlObject = this._target;
      const q = new THREE.Quaternion();
      const a = new THREE.Vector3();
      const r = controlObject.quaternion.clone();

      a.set(0, 1, 0);
      q.setFromAxisAngle(a, Math.PI * timeInSeconds * -this.xValue);
      r.multiply(q);

      this._target.quaternion.copy(r);
      this._parent.SetQuaternion(this._target.quaternion);

      const forward = new THREE.Vector3(0, 0, 1);
      forward.applyQuaternion(controlObject.quaternion);
      forward.normalize();

      this.playerVelocity.add(forward.multiplyScalar(this.yValue * timeInSeconds * (this.playerOnFloor ? 100 : 25)));

      let damping = Math.exp(- 4 * timeInSeconds) - 1;

      if (!this.playerOnFloor) {

        this.playerVelocity.y -= this.GRAVITY * timeInSeconds;

        // small air resistance
        damping *= 0.1;

      }
      else if (Input.GetKeyDown('Space')) {
        this.playerVelocity.y = 30;
        this._stateMachine.Update(timeInSeconds, 4);
      }

      this.playerVelocity.addScaledVector(this.playerVelocity, damping);

      const deltaPosition = this.playerVelocity.clone().multiplyScalar(timeInSeconds);

      this.playerCollider.translate(deltaPosition);

      this.playerCollisions();

      controlObject.position.copy(this.playerCollider.end);

      this._parent.SetPosition(controlObject.position);
    }

    playerCollisions() {

      const result = this.worldOctree.capsuleIntersect(this.playerCollider);

      this.playerOnFloor = false;

      if (result) {

        this.playerOnFloor = result.normal.y > 0;

        if (!this.playerOnFloor) {

          this.playerVelocity.addScaledVector(result.normal, - result.normal.dot(this.playerVelocity));

        }

        this.playerCollider.translate(result.normal.multiplyScalar(result.depth));

      }

    }
  };

  return {
    BasicCharacterControllerProxy: BasicCharacterControllerProxy,
    BasicCharacterController: BasicCharacterController,
  };

})();
