(function (Ember, Firebase, undefined) {

  var get = Ember.get,
      set = Ember.set,
      fmt = Ember.String.fmt,
      RSVP = Ember.RSVP;

  /**
   * Returns a promise for the value at the given ref.
   */
  Firebase.get = function (ref) {
    var deferred = RSVP.defer();
    ref.once('value', deferred.resolve, deferred.reject);
    return deferred.promise;
  };

  /**
   * Sets the value of the given ref, with an optional priority. Returns
   * a promise that is resolved when the sync is complete.
   */
  Firebase.set = function (ref, value, priority) {
    var deferred = RSVP.defer();

    function onComplete(error) {
      if (error) {
        deferred.reject(error);
      } else {
        deferred.resolve();
      }
    }

    if (priority === undefined) {
      ref.set(value, onComplete);
    } else {
      ref.setWithPriority(value, priority, onComplete);
    }

    return deferred.promise;
  };

  /**
   * An Ember.Mixin for objects that are a proxy for a Firebase location.
   */
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

  /**
   * An Ember.ObjectProxy for a Firebase data structure.
   * See https://www.firebase.com/docs/data-structure.html
   */
  Firebase.Object = Ember.ObjectProxy.extend(Firebase.Proxy, {

    init: function () {
      this._resetContent();
      this._super();
    },

    _resetContent: function () {
      set(this, 'content', {});
    }.observesBefore('ref'),

    /**
     * Ember.set uses this method to set properties on objects when the property
     * is not already present. We use it to set values on the underlying ref
     * instead, which propagates those changes to all listeners synchronously.
     */
    setUnknownProperty: function (property, object) {
      get(this, 'ref').child(property).set(getObjectValue(object));
      return get(this, property);
    },

    childWasAdded: function (snapshot) {
      return set(get(this, 'content'), snapshot.name(), getSnapshotValue(snapshot));
    },

    childWasChanged: function (snapshot) {
      return set(get(this, 'content'), snapshot.name(), getSnapshotValue(snapshot));
    },

    childWasRemoved: function (snapshot) {
      return set(get(this, 'content'), snapshot.name(), undefined);
    },

    toJSON: function () {
      var json = {};

      var content = get(this, 'content');
      for (var property in content) {
        json[property] = get(content, property);
      }

      return json;
    },

    toString: function () {
      return fmt('<%@:%@>', [ get(this, 'constructor').toString(), get(this, 'ref').toString() ]);
    }

  });

  Firebase.Object.reopenClass({

    toString: function () {
      return 'Firebase.Object';
    }

  });

  /**
   * An Ember.ArrayProxy that respects the ordering of a Firebase data structure.
   * See https://www.firebase.com/docs/managing-lists.html
   *
   * IMPORTANT: There is currently no way to preserve the ordering of an array in a
   * Firebase data structure. Thus, when you add objects to a Firebase.Array using
   * Ember.MutableArray's methods (e.g. insertAt, unshiftObject, etc.) you will not
   * see that ordering in the array. Instead, all objects added to an array are
   * simply pushed onto it.
   *
   * If you need to enforce your own ordering you must use Firebase's priority feature.
   * You can either use the setWithPriority method directly on a child location of
   * this array's ref, or use pushObjectWithPriority.
   *
   * For more information on priorities and how Firebase stores ordered data, see
   * https://www.firebase.com/docs/ordered-data.html
   */
  Firebase.Array = Ember.ArrayProxy.extend(Firebase.Proxy, {

    init: function () {
      this._resetContent();
      this._super();
    },

    _resetContent: function () {
      set(this, 'content', Ember.A());
      this._names = [];
    }.observesBefore('ref'),

    /**
     * A convenience method for unconditionally adding an object to this array
     * with the given priority. For more information on Firebase priorities, see
     * https://www.firebase.com/docs/ordered-data.html
     */
    pushObjectWithPriority: function (object, priority) {
      get(this, 'ref').push().setWithPriority(getObjectValue(object), priority);
    },

    /**
     * All Ember.MutableArray methods use this method to do modifications on the
     * array proxy's content. We use it instead to do modifications on the underlying
     * ref which propagates those changes to all listeners synchronously.
     */
    replaceContent: function (index, amount, objects) {
      var ref = get(this, 'ref');

      // Remove objects that are being replaced.
      for (var i = 0; i < amount; ++i) {
        ref.child(this._names[index + i]).remove();
      }

      // Add new objects.
      objects.forEach(function (object) {
        // TODO: Is there any way we can add the objects
        // at the given index instead of just using push?
        ref.push(getObjectValue(object));
      });
    },

    _indexAfter: function (name) {
      return name ? this._names.indexOf(name) + 1 : 0;
    },

    childWasAdded: function (snapshot, previousName) {
      var index = this._indexAfter(previousName);
      get(this, 'content').insertAt(index, getSnapshotValue(snapshot));
      this._names[index] = snapshot.name();
    },

    childWasChanged: function (snapshot, previousName) {
      var index = this._indexAfter(previousName);
      get(this, 'content').replace(index, 1, [ getSnapshotValue(snapshot) ]);
      this._names[index] = snapshot.name();
    },

    childWasRemoved: function (snapshot) {
      var index = this._names.indexOf(snapshot.name());
      if (index !== -1) {
        get(this, 'content').removeAt(index);
        this._names.splice(index, 1);
      }
    },

    childWasMoved: function (snapshot, previousName) {
      this.childWasRemoved(snapshot);
      this.childWasAdded(snapshot, previousName);
    },

    toJSON: function () {
      var content = get(this, 'content');
      var names = this._names;

      var json = {};
      for (var i = 0, len = names.length; i < len; ++i) {
        json[names[i]] = content.objectAt(i);
      }

      return json;
    },

    toString: function () {
      return fmt('<%@:%@>', [ get(this, 'constructor').toString(), get(this, 'ref').toString() ]);
    }

  });

  Firebase.Array.reopenClass({

    toString: function () {
      return 'Firebase.Array';
    }

  });

  function getSnapshotValue(snapshot) {
    if (snapshot.hasChildren()) {
      return Firebase.Object.create({ ref: snapshot.ref() });
    }

    return snapshot.val();
  }

  function getObjectValue(object) {
    return object && object.toJSON ? object.toJSON() : object;
  }

}(Ember, Firebase));
