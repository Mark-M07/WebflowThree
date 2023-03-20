import * as THREE from 'https://unpkg.com/three@0.150.1/build/three.module.js';
import { third_person_camera } from './third-person-camera.js';
import { entity_manager } from './entity-manager.js';
import { player_entity } from './player-entity.js'
import { entity } from './entity.js';
import { gltf_component } from './gltf-component.js';
import { player_input } from './player-input.js';
import { level_up_component } from './level-up-component.js';
import { animal_entity } from './animal-entity.js'; 

const _VS = `
varying vec3 vWorldPosition;

void main() {
  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
  vWorldPosition = worldPosition.xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`;


const _FS = `
uniform vec3 topColor;
uniform vec3 bottomColor;
uniform float offset;
uniform float exponent;

varying vec3 vWorldPosition;

void main() {
  float h = normalize( vWorldPosition + offset ).y;
  gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h , 0.0), exponent ), 0.0 ) ), 1.0 );
}`;

export default class HackNSlashDemo {
  constructor() {
    this._Initialize();
  }

  _Initialize() {
    this.renderer = new THREE.WebGLRenderer({
      //antialias: true,
    });
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.gammaFactor = 2.2;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.domElement.id = 'threejs';

    document.getElementById('container').appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this._OnWindowResize();
    }, false);

    this._camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 2000);
    this._camera.position.set(25, 10, 25);

    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0xFFFFFF);
    this._scene.fog = new THREE.FogExp2(0x89b2eb, 0.002);

    let light = new THREE.DirectionalLight(0xFFFFFF, 0.5);
    light.castShadow = true;
    light.shadow.bias = -0.001;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 1000.0;
    light.shadow.camera.left = 20;
    light.shadow.camera.right = -20;
    light.shadow.camera.top = 20;
    light.shadow.camera.bottom = -20;
    this._scene.add(light);

    this._sun = light;

    let alight = new THREE.AmbientLight(0xFFFFFF, 1.0);
    this._scene.add(alight);

    this._entityManager = new entity_manager.EntityManager();

    this._LoadPlayer();
    this._LoadEnvironment();
    this._LoadSky();
    this._LoadAnimal();
    //this.LoadAssets(this._scene);

    this._previousRAF = null;
    this._RAF();
  }

  _LoadSky() {
    const uniforms = {
      "topColor": { value: new THREE.Color(0x0077ff) },
      "bottomColor": { value: new THREE.Color(0xffffff) },
      "offset": { value: 33 },
      "exponent": { value: 0.6 }
    };

    this._scene.fog.color.copy(uniforms["bottomColor"].value);

    const skyGeo = new THREE.SphereBufferGeometry(1000, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: uniforms,
      vertexShader: _VS,
      fragmentShader: _FS,
      side: THREE.BackSide
    });

    const sky = new THREE.Mesh(skyGeo, skyMat);
    this._scene.add(sky);
  }

  /*async LoadAssets(scene) {
    const dracoLoader = new DRACOLoader();

    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.1/');

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    gltfLoader.load('/models/Farm.glb', function (gltf) {
      scene.add(gltf.scene);
    },
      // called as loading progresses
      function (xhr) {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
      },
      // called when loading has errors
      function (error) {
        console.log('An error happened: ' + error);
      }
    );

    // Release decoder resources.
    dracoLoader.dispose();
  }*/

  _LoadEnvironment() {
    const e = new entity.Entity();
    e.AddComponent(new gltf_component.StaticModelComponent({
      scene: this._scene,
      resourcePath: 'https://cdn.jsdelivr.net/gh/Mark-M07/WebflowThree@main/public/models/',
      resourceName: 'Farm.glb',
      scale: 6,
      //castShadow: true,
      receiveShadow: true,
    }));
    this._entityManager.Add(e);
    e.SetActive(false);
  }

  _LoadAnimal() {
    const p = new THREE.Vector3(50, 0, 50);
    const params = {
      camera: this._camera,
      scene: this._scene,
    };
    const cow = new entity.Entity();
    cow.AddComponent(new animal_entity.AnimalFSM(params));
    cow.AddComponent(new gltf_component.AnimatedModelComponent({
      scene: this._scene,
      resourcePath: 'https://cdn.jsdelivr.net/gh/Mark-M07/WebflowThree@main/public/models/animals/',
      resourceName: 'Cow.fbx',
      resourceAnimation: 'Cow.fbx',
      position: p,
      scale: 0.016,
      //castShadow: true,
    }));
    cow.SetPosition(p);
    this._entityManager.Add(cow, 'moo-cow');
  }

  _LoadPlayer() {
    const params = {
      camera: this._camera,
      scene: this._scene,
    };

    const levelUpSpawner = new entity.Entity();
    levelUpSpawner.AddComponent(new level_up_component.LevelUpComponentSpawner({
      camera: this._camera,
      scene: this._scene,
    }));
    this._entityManager.Add(levelUpSpawner, 'level-up-spawner');

    const player = new entity.Entity();
    player.AddComponent(new player_input.BasicCharacterControllerInput(params));
    player.AddComponent(new player_entity.BasicCharacterController(params));
    this._entityManager.Add(player, 'player');

    const camera = new entity.Entity();
    camera.AddComponent(
      new third_person_camera.ThirdPersonCamera({
        camera: this._camera,
        target: this._entityManager.Get('player')
      }));
    this._entityManager.Add(camera, 'player-camera');
  }

  _OnWindowResize() {
    const { innerHeight, innerWidth } = window;
    this._camera.aspect = innerWidth / innerHeight;
    this._camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }

  _UpdateSun() {
    const player = this._entityManager.Get('player');
    const pos = player._position;

    this._sun.position.copy(pos);
    this._sun.position.add(new THREE.Vector3(-10, 500, -10));
    this._sun.target.position.copy(pos);
    this._sun.updateMatrixWorld();
    this._sun.target.updateMatrixWorld();
  }

  _RAF() {
    requestAnimationFrame((t) => {
      if (this._previousRAF === null) {
        this._previousRAF = t;
      }
      this.renderer.render(this._scene, this._camera);
      this._Step(t - this._previousRAF);
      this._previousRAF = t;
      this._UpdateSun();
      this._RAF();
    });
  }

  _Step(timeElapsed) {
    const timeElapsedS = Math.min(1.0 / 30.0, timeElapsed * 0.001);
    this._entityManager.Update(timeElapsedS);
  }
}
