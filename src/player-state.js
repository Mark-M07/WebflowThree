import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.118/build/three.module.js';

export const player_state = (() => {

  class State {
    constructor(parent) {
      this._parent = parent;
    }

    Enter() { }
    Exit() { }
    Update() { }
  };

  class JumpState extends State {
    constructor(parent) {
      super(parent);

      this._action = null;

      this._FinishedCallback = () => {
        this._Finished();
      }
    }

    get Name() {
      return 'jump';
    }

    Enter(prevState) {
      this._action = this._parent._proxy._animations['jump'].action;
      const mixer = this._action.getMixer();
      mixer.addEventListener('finished', this._FinishedCallback);

      if (prevState) {
        const prevAction = this._parent._proxy._animations[prevState.Name].action;
        this._action.reset();
        this._action.setLoop(THREE.LoopOnce, 1);
        this._action.clampWhenFinished = true;
        this._action.crossFadeFrom(prevAction, 0.25, true);
        this._action.play();
      } else {
        this._action.play();
      }
    }

    _Finished() {
      this._Cleanup();
      switch (this.moving) {
        case 0:
          this._parent.SetState('idle');
          break;
        case 1:
          this._parent.SetState('walk');
          break;
        case 2:
          this._parent.SetState('run');
          break;
        case 3:
          this._parent.SetState('walkBack');
          break;
      }
    }

    _Cleanup() {
      if (this._action) {
        this._action.getMixer().removeEventListener('finished', this._FinishedCallback);
      }
    }

    Exit() {
      this._Cleanup();
    }

    Update(timeElapsed, moving) {
      this.moving = moving;
    }
  };

  class WalkState extends State {
    constructor(parent) {
      super(parent);
    }

    get Name() {
      return 'walk';
    }

    Enter(prevState) {
      const curAction = this._parent._proxy._animations['walk'].action;
      if (prevState) {
        const prevAction = this._parent._proxy._animations[prevState.Name].action;

        curAction.enabled = true;

        if (prevState.Name == 'run') {
          const ratio = curAction.getClip().duration / prevAction.getClip().duration;
          curAction.time = prevAction.time * ratio;
        } else {
          curAction.time = 0.0;
          curAction.setEffectiveTimeScale(1.0);
          curAction.setEffectiveWeight(1.0);
        }

        curAction.crossFadeFrom(prevAction, 0.25, true);
        curAction.play();
      } else {
        curAction.play();
      }
    }

    Exit() {
    }

    Update(timeElapsed, moving) {
      switch (moving) {
        case 0:
          this._parent.SetState('idle');
          break;
        case 2:
          this._parent.SetState('run');
          break;
        case 3:
          this._parent.SetState('walkBack');
          break;
        case 4:
          this._parent.SetState('jump');
          break;
      }
    }
  };

  class WalkBackState extends State {
    constructor(parent) {
      super(parent);
    }

    get Name() {
      return 'walkBack';
    }

    Enter(prevState) {
      const curAction = this._parent._proxy._animations['walkBack'].action;
      if (prevState) {
        const prevAction = this._parent._proxy._animations[prevState.Name].action;

        curAction.enabled = true;

        if (prevState.Name == 'run') {
          const ratio = curAction.getClip().duration / prevAction.getClip().duration;
          curAction.time = prevAction.time * ratio;
        } else {
          curAction.time = 0.0;
          curAction.setEffectiveTimeScale(1.0);
          curAction.setEffectiveWeight(1.0);
        }

        curAction.crossFadeFrom(prevAction, 0.25, true);
        curAction.play();
      } else {
        curAction.play();
      }
    }

    Exit() {
    }

    Update(timeElapsed, moving) {
      switch (moving) {
        case 0:
          this._parent.SetState('idle');
          break;
        case 1:
          this._parent.SetState('walk');
          break;
        case 2:
          this._parent.SetState('run');
          break;
        case 4:
          this._parent.SetState('jump');
          break;
      }
    }
  };


  class RunState extends State {
    constructor(parent) {
      super(parent);
    }

    get Name() {
      return 'run';
    }

    Enter(prevState) {
      const curAction = this._parent._proxy._animations['run'].action;
      if (prevState) {
        const prevAction = this._parent._proxy._animations[prevState.Name].action;

        curAction.enabled = true;

        if (prevState.Name == 'walk') {
          const ratio = curAction.getClip().duration / prevAction.getClip().duration;
          curAction.time = prevAction.time * ratio;
        } else {
          curAction.time = 0.0;
          curAction.setEffectiveTimeScale(1.0);
          curAction.setEffectiveWeight(1.0);
        }

        curAction.crossFadeFrom(prevAction, 0.25, true);
        curAction.play();
      } else {
        curAction.play();
      }
    }

    Exit() {
    }

    Update(timeElapsed, moving) {
      switch (moving) {
        case 0:
          this._parent.SetState('idle');
          break;
        case 1:
          this._parent.SetState('walk');
          break;
        case 3:
          this._parent.SetState('walkBack');
          break;
        case 4:
          this._parent.SetState('jump');
          break;
      }
    }
  };


  class IdleState extends State {
    constructor(parent) {
      super(parent);
    }

    get Name() {
      return 'idle';
    }

    Enter(prevState) {
      const idleAction = this._parent._proxy._animations['idle'].action;
      if (prevState) {
        const prevAction = this._parent._proxy._animations[prevState.Name].action;
        idleAction.time = 0.0;
        idleAction.enabled = true;
        idleAction.setEffectiveTimeScale(1.0);
        idleAction.setEffectiveWeight(1.0);
        idleAction.crossFadeFrom(prevAction, 0.25, true);
        idleAction.play();
      } else {
        idleAction.play();
      }
    }

    Exit() {
    }

    Update(_, moving) {
      switch (moving) {
        case 1:
          this._parent.SetState('walk');
          break;
        case 2:
          this._parent.SetState('run');
          break;
        case 3:
          this._parent.SetState('walkBack');
          break;
        case 4:
          this._parent.SetState('jump');
          break;
      }
    }
  };

  return {
    State: State,
    JumpState: JumpState,
    IdleState: IdleState,
    WalkState: WalkState,
    WalkBackState: WalkBackState,
    RunState: RunState,
  };

})();