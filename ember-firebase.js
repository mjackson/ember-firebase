(function (Ember, undefined) {

  var get = Ember.get, set = Ember.set, fmt = Ember.String.fmt;

  Firebase.Proxy = Ember.Mixin.create({

    ref: null,

    init: function () {
      this._super();
      this._setupRef();
    },

    willDestroy: function () {
      this._teardownRef();
    },

    _setupRef: function () {
      var ref = get(this, 'ref');

      if (ref) {
        ref.on('value', this.valueDidChange, this);
        ref.on('child_added', this.childWasAdded, this);
        ref.on('child_changed', this.childWasChanged, this);
        ref.on('child_removed', this.childWasRemoved, this);
        ref.on('child_moved', this.childWasMoved, this);
      }
    }.observes('ref'),

    _teardownRef: function () {
      var ref = get(this, 'ref');

      if (ref) {
        ref.off('value', this.valueDidChange);
        ref.off('child_added', this.childWasAdded);
        ref.off('child_changed', this.childWasChanged);
        ref.off('child_removed', this.childWasRemoved);
        ref.off('child_moved', this.childWasMoved);
      }
    }.observesBefore('ref'),

    valueDidChange: Ember.K,
    childWasAdded: Ember.K,
    childWasChanged: Ember.K,
    childWasRemoved: Ember.K,
    childWasMoved: Ember.K

  });

  Firebase.Proxy.toString = function () {
    return 'Firebase.Proxy';
  };

  Firebase.Object = Ember.ObjectProxy.extend(Firebase.Proxy, {

    init: function () {
      this._resetContent();
      this._super();
    },

    _resetContent: function () {
      set(this, 'content', {});
    }.observesBefore('ref'),

    setUnknownProperty: function (property, value) {
      get(this, 'ref').child(property).set(value);
      return get(this, property);
    },

    childWasAdded: function (snapshot) {
      return this._setContentProperty(snapshot.name(), getSnapshotValue(snapshot));
    },

    childWasChanged: function (snapshot) {
      return this._setContentProperty(snapshot.name(), getSnapshotValue(snapshot));
    },

    childWasRemoved: function (snapshot) {
      return this._setContentProperty(snapshot.name(), undefined);
    },

    _setContentProperty: function (property, value) {
      var content = get(this, 'content');
      Ember.assert(fmt("Cannot delegate set('%@', %@) to the 'content' property of object proxy %@: its 'content' is undefined.", [ property, value, this ]), content);
      return set(content, property, value);
    },

    toJSON: function () {
      var jsonProperties = {};

      var content = get(this, 'content');
      for (var property in content) {
        jsonProperties[property] = get(content, property);
      }

      return jsonProperties;
    }

  });

  Firebase.Object.reopenClass({

    toString: function () {
      return 'Firebase.Object';
    }

  });

  function getSnapshotValue(snapshot) {
    if (snapshot.hasChildren()) {
      return Firebase.Object.create({ ref: snapshot.ref() });
    }

    return snapshot.val();
  }

  // var FirebaseArray = Ember.ArrayProxy.extend(FirebaseProxy, {
  //
  //   _contentType: 'array',
  //
  //   _resetContent: function () {
  //     set(this, 'content', []);
  //     this._names = Ember.A();
  //   },
  //
  //   _indexAfter: function (name) {
  //     return name ? this._names.indexOf(name) + 1 : 0;
  //   },
  //
  //   _childWasAdded: function (snapshot, previousName) {
  //     if (snapshot.name() === '_contentType') return;
  //     var index = this._indexAfter(previousName);
  //     this.insertAt(index, createObject(snapshot));
  //     this._names[index] = snapshot.name();
  //   },
  //
  //   _childWasChanged: function (snapshot, previousName) {
  //     if (snapshot.name() === '_contentType') return;
  //     var index = this._indexAfter(previousName);
  //     this.replace(index, 1, [ createObject(snapshot) ]);
  //     this._names[index] = snapshot.name();
  //   },
  //
  //   _childWasMoved: function (snapshot, previousName) {
  //     // TODO: Do we need this?
  //   },
  //
  //   _childWasRemoved: function (snapshot) {
  //     if (snapshot.name() === '_contentType') return;
  //     var index = this._names.indexOf(snapshot.name());
  //     if (index !== -1) {
  //       this.removeAt(index);
  //       this._names.splice(index, 1);
  //     }
  //   },
  //
  //   replaceContent: function (index, amount, objects) {
  //     var ref = this.get('ref');
  //
  //     for (var i = 0; i < amount; ++i) {
  //       var name = this._names[index + i];
  //       ref.child(name).remove();
  //     }
  //
  //     objects.forEach(function (object) {
  //       if (object.toJSON) {
  //         ref.push(object.toJSON());
  //       } else {
  //         ref.push(object);
  //       }
  //     });
  //   },
  //
  //   toJSON: function () {
  //     var content = get(this, 'content');
  //
  //     var json = {};
  //     for (var i = 0, len = this._names.length; i < len; ++i) {
  //       json[this._names[i]] = get(content, i);
  //     }
  //
  //     json._contentType = get(this, '_contentType');
  //
  //     return json;
  //   }
  //
  // });
  //
  // function createObject(snapshot) {
  //   var value = snapshot.val();
  //   var contentType = value._contentType;
  //
  //   if (contentType === 'object') {
  //     return FirebaseObject.create({ ref: snapshot.ref() });
  //   }
  //
  //   if (contentType === 'array') {
  //     return FirebaseArray.create({ ref: snapshot.ref() });
  //   }
  //
  //   return value;
  // }

}(Ember));
