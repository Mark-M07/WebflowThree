
import { entity } from './entity.js';

export const animal_entity = (() => {

  class AnimalFSM extends entity.Component {
    constructor(params) {
      super();
    }


    Update(timeInSeconds) {
      //console.log(this.mixer);
      //console.log(this._parent._mesh.animations[3]);
      //if (this._mixer) {
      //  this._mixer.update(timeInSeconds);
      //}
    }
  };

  return {
    AnimalFSM: AnimalFSM,
  };

})();