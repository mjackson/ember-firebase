(function (Ember, Firebase, undefined) {

  var get = Ember.get,
      set = Ember.set,
      fmt = Ember.String.fmt,
      forEach = Ember.EnumerableUtils.forEach,
      RSVP = Ember.RSVP;

  /**
   * Returns a promise for the value at the given ref.
   */
  Firebase.get = function (ref) {
    var deferred = RSVP.defer();

    ref.once('value', function (snapshot) {
      deferred.resolve(getSnapshotValue(snapshot));
    }, deferred.reject);

    return deferred.promise;
  };

  /**
   * Sets the value of the given ref with an optional priority. Returns a
   * promise that resolves to the location reference when the sync is complete.
   */
  Firebase.set = function (ref, object, priority) {
    var value = getFirebaseValue(object);
    var deferred = RSVP.defer();

    function onComplete(error) {
      if (error) {
        deferred.reject(error);
      } else {
        deferred.resolve(ref);
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
   * Pushes a value onto the given ref with an optional priority. Returns a
   * promise that resolves to the newly created location reference when the
   * sync is complete.
   */
  Firebase.push = function (ref, object, priority) {
    return Firebase.set(ref.push(), object, priority);
  };

  /**
   * Removes the value at the given ref. Returns a promise that resolves to
   * the ref when the sync is complete.
   */
  Firebase.remove = function (ref) {
    return Firebase.set(ref, null);
  };

  /**
   * Updates the value at the given ref with the given object. Returns a
   * promise that resolves to the ref when the sync is complete.
   */
  Firebase.update = function (ref, object) {
    var value = getFirebaseValue(object);
    var deferred = RSVP.defer();

    ref.update(value, function (error) {
      if (error) {
        deferred.reject(error);
      } else {
        deferred.resolve(ref);
      }
    });

    return deferred.promise;
  };

  /**
   * An Ember.Mixin for objects that are a proxy for a Firebase location
   * reference (or query).
   */
  Firebase.Proxy = Ember.Mixin.create({

    /**
     * The Firebase location reference for this proxy. May also be a
     * Firebase query object.
     *
     * See https://www.firebase.com/docs/javascript/firebase/index.html
     * and https://www.firebase.com/docs/javascript/query/index.html
     */
    ref: null,

    /**
     * The writable Firebase location reference that can be used to
     * create child refs. This is only needed when the original ref
     * is really a query.
     */
    baseRef: Ember.computed(function () {
      var ref = get(this, 'ref');
      return isFirebaseQuery(ref) ? ref.ref() : ref;
    }).property('ref'),

    /**
     * The Firebase URL for this proxy's location reference.
     */
    baseUrl: Ember.computed(function () {
      var baseRef = get(this, 'baseRef');
      return baseRef && baseRef.toString();
    }).property('baseRef'),

    init: function () {
      this._super();
      this._setupRef();
    },

    willDestroy: function () {
      this._teardownRef();
    },

    _setupRef: Ember.observer(function () {
      var ref = get(this, 'ref');

      if (ref) {
        ref.on('child_added', this.childWasAdded, this);
        ref.on('child_changed', this.childWasChanged, this);
        ref.on('child_removed', this.childWasRemoved, this);
        ref.on('child_moved', this.childWasMoved, this);
      }
    }, 'ref'),

    _teardownRef: Ember.beforeObserver(function () {
      var ref = get(this, 'ref');

      if (ref) {
        ref.off('child_added', this.childWasAdded);
        ref.off('child_changed', this.childWasChanged);
        ref.off('child_removed', this.childWasRemoved);
        ref.off('child_moved', this.childWasMoved);
      }
    }, 'ref'),

    childWasAdded: Ember.K,
    childWasChanged: Ember.K,
    childWasRemoved: Ember.K,
    childWasMoved: Ember.K,

    /**
     * Alters this proxy's ref to be limited to the given value.
     * Returns this proxy.
     *
     * See https://www.firebase.com/docs/javascript/firebase/limit.html
     */
    limit: function (value) {
      set(this, 'ref', get(this, 'ref').limit(value));
      return this;
    },

    /**
     * Alters this proxy's ref to start at the given priority and name.
     * Returns this proxy.
     *
     * See https://www.firebase.com/docs/javascript/firebase/startat.html
     */
    startAt: function (priority, name) {
      set(this, 'ref', get(this, 'ref').startAt(priority, name));
      return this;
    },

    /**
     * Alters this proxy's ref to end at the given priority and name.
     * Returns this proxy.
     *
     * See https://www.firebase.com/docs/javascript/firebase/endat.html
     */
    endAt: function (priority, name) {
      set(this, 'ref', get(this, 'ref').endAt(priority, name));
      return this;
    },

    /**
     * Creates a Firebase location reference to the child location with
     * the given name. If the name is not given a new location is generated
     * using push(). If it is given, it may contain a string format that will
     * use all remaining arguments.
     *
     *   proxy.childRef('chats/%@/messages', chat.id);
     *
     * See https://www.firebase.com/docs/javascript/firebase/child.html
     * and https://www.firebase.com/docs/javascript/firebase/push.html
     */
    childRef: function (childName) {
      var ref = get(this, 'baseRef');
      Ember.assert(fmt('Cannot create child ref of %@, ref is missing', [ this ]), ref);

      if (childName) {
        return ref.child(fmt(childName, [].slice.call(arguments, 1)));
      }

      return ref.push();
    }

  });

  Firebase.Proxy.toString = function () {
    return 'Firebase.Proxy';
  };

  /**
   * An Ember.ObjectProxy for a Firebase data structure.
   *
   * See https://www.firebase.com/docs/data-structure.html
   */
  Firebase.Hash = Ember.ObjectProxy.extend(Firebase.Proxy, {

    init: function () {
      this._resetContent();
      this._super();
    },

    _resetContent: Ember.beforeObserver(function () {
      set(this, 'content', {});
    }, 'ref'),

    /**
     * Returns true if this hash has a child with the given name.
     *
     * Note: This method only checks local values. Thus it may not be
     * accurate when using a query to filter the data.
     */
    hasChild: function (childName) {
      return (childName in get(this, 'content'));
    },

    /**
     * A hook that subclasses can use to coerce the value from a snapshot.
     */
    createValueFromSnapshot: getSnapshotValue,

    childWasAdded: function (snapshot) {
      set(get(this, 'content'), snapshot.name(), this.createValueFromSnapshot(snapshot));
    },

    childWasChanged: function (snapshot) {
      set(get(this, 'content'), snapshot.name(), this.createValueFromSnapshot(snapshot));
    },

    childWasRemoved: function (snapshot) {
      set(get(this, 'content'), snapshot.name(), undefined);
    },

    /**
     * Ember.set uses this method to set properties on objects when the property
     * is not already present. We use it to set values on the underlying ref
     * instead, which propagates those changes to all listeners synchronously.
     */
    setUnknownProperty: function (property, object) {
      var ref = get(this, 'baseRef');
      Ember.assert(fmt('Cannot set property %@ on %@, ref is missing', [ property, this ]), ref);

      ref.child(property).set(getFirebaseValue(object));

      return object;
    },

    /**
     * A convenience method for setting a property value with the given priority.
     */
    setWithPriority: function (property, object, priority) {
      var ref = get(this, 'baseRef');
      Ember.assert(fmt('Cannot set property %@ on %@, ref is missing', [ property, this ]), ref);

      ref.child(property).setWithPriority(getFirebaseValue(object), priority);

      return object;
    },

    /**
     * Returns a new Firebase.List created from this hash's location reference.
     */
    toList: function () {
      return Firebase.List.create({ ref: get(this, 'ref') });
    },

    /**
     * Returns a string representation of this hash.
     */
    toString: function () {
      return fmt('<%@:%@>', [ get(this, 'constructor'), get(this, 'baseUrl') ]);
    },

    /**
     * Returns a plain JavaScript object representation of this hash.
     */
    toJSON: function () {
      var json = {};

      var content = get(this, 'content');
      for (var property in content) {
        json[property] = getFirebaseValue(get(content, property));
      }

      return json;
    }

  });

  Firebase.Hash.reopenClass({

    toString: function () {
      return 'Firebase.Hash';
    }

  });

  /**
   * An Ember.ArrayProxy that respects the ordering of a Firebase data structure.
   *
   * IMPORTANT: There is currently no way to reliably alter the ordering of an array
   * in a Firebase data structure. Thus, when you add objects to a Firebase.List using
   * Ember.MutableArray's methods (e.g. insertAt, unshiftObject, etc.) you will not
   * see that ordering in the list. Instead, all objects added to a list are simply
   * appended to the end.
   *
   * If you need to enforce your own ordering you must use Firebase's priority feature.
   * You can either use the setWithPriority method directly on a child of this list's
   * location reference, or use pushWithPriority.
   *
   * For more information on how Firebase stores ordered data and priorities, see
   * https://www.firebase.com/docs/managing-lists.html and
   * https://www.firebase.com/docs/ordered-data.html
   */
  Firebase.List = Ember.ArrayProxy.extend(Firebase.Proxy, {

    init: function () {
      this._resetContent();
      this._super();
    },

    _resetContent: Ember.beforeObserver(function () {
      set(this, 'content', Ember.A([]));
      this._names = [];
    }, 'ref'),

    /**
     * Returns true if this list has a child with the given name.
     *
     * Note: This method only checks local values. Thus it may not be
     * accurate when using a query to filter the data.
     */
    hasChild: function (childName) {
      return this._names.indexOf(childName) !== -1;
    },

    /**
     * Returns the child name of the item at the given index.
     */
    childNameAt: function (index) {
      return this._names[index];
    },

    /**
     * A hook that subclasses can use to coerce the value from a snapshot.
     */
    createValueFromSnapshot: getSnapshotValue,

    _indexAfter: function (childName) {
      return childName ? this._names.indexOf(childName) + 1 : 0;
    },

    childWasAdded: function (snapshot, previousName) {
      var index = this._indexAfter(previousName);
      get(this, 'content').insertAt(index, this.createValueFromSnapshot(snapshot));
      this._names[index] = snapshot.name();
    },

    childWasChanged: function (snapshot, previousName) {
      var index = this._indexAfter(previousName);
      get(this, 'content').replace(index, 1, [ this.createValueFromSnapshot(snapshot) ]);
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

    /**
     * All Ember.MutableArray methods use this method to modify the array proxy's
     * content. We use it to make modifications on the underlying ref instead which
     * propagates those changes to all listeners synchronously.
     */
    replaceContent: function (index, amount, objects) {
      var ref = get(this, 'baseRef');
      Ember.assert(fmt('Cannot replace content of %@, ref is missing', [ this ]), ref);

      // Remove objects that are being replaced.
      forEach(this._names.slice(index, index + amount), function (childName) {
        ref.child(childName).remove();
      });

      // Add new objects.
      forEach(objects, function (object) {
        // TODO: Is there any way we can add the objects
        // at the given index instead of just using push?
        ref.push().set(getFirebaseValue(object));
      });
    },

    /**
     * A convenience method for unconditionally adding an object to this list
     * with the given priority.
     *
     * See https://www.firebase.com/docs/ordered-data.html
     */
    pushWithPriority: function (object, priority) {
      var ref = get(this, 'baseRef');
      Ember.assert(fmt('Cannot push object %@ on %@, ref is missing', [ object, this ]), ref);

      ref.push().setWithPriority(getFirebaseValue(object), priority);

      return object;
    },

    /**
     * Returns a new Firebase.Hash created from this list's location reference.
     */
    toHash: function () {
      return Firebase.Hash.create({ ref: get(this, 'ref') });
    },

    /**
     * Returns a string representation of this list.
     */
    toString: function () {
      return fmt('<%@:%@>', [ get(this, 'constructor'), get(this, 'baseUrl') ]);
    },

    /**
     * Returns a plain JavaScript object representation of this list.
     */
    toJSON: function () {
      var content = get(this, 'content');
      var names = this._names;

      var json = {};
      for (var i = 0, len = names.length; i < len; ++i) {
        json[names[i]] = getFirebaseValue(content[i]);
      }

      return json;
    }

  });

  Firebase.List.reopenClass({

    toString: function () {
      return 'Firebase.List';
    }

  });

  /**
   * The default function used to coerce the value from a snapshot. Returns a
   * Firebase.Hash for snapshots with children, the plain value otherwise.
   */
  function getSnapshotValue(snapshot) {
    if (snapshot.hasChildren()) {
      return Firebase.Hash.create({ ref: snapshot.ref() });
    }

    return snapshot.val();
  }

  /**
   * Returns a representation of the given object that is able to be saved
   * to a Firebase location.
   */
  function getFirebaseValue(object) {
    return object && isFunction(object.toJSON) ? object.toJSON() : object;
  }

  function isFirebaseQuery(object) {
    return object && isFunction(object.ref);
  }

  function isFunction(object) {
    return object && typeof object === 'function';
  }

}(Ember, Firebase));
