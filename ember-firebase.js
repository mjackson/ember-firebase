(function (Ember, Firebase, undefined) {

  var get = Ember.get,
      set = Ember.set,
      fmt = Ember.String.fmt,
      map = Ember.EnumerableUtils.map,
      forEach = Ember.EnumerableUtils.forEach,
      RSVP = Ember.RSVP;

  /**
   * Returns a promise for the value at the given ref. The second argument
   * specifies a function that will be used to coerce the value from the
   * snapshot before resolving the promise. By default it uses snapshot.val().
   */
  Firebase.get = function (ref, createValueFromSnapshot) {
    createValueFromSnapshot = createValueFromSnapshot || getSnapshotValue;

    var deferred = RSVP.defer();

    ref.once('value', function (snapshot) {
      deferred.resolve(createValueFromSnapshot(snapshot));
    }, deferred.reject);

    return deferred.promise;
  };

  /**
   * Returns a promise for the value at the given ref, defaulting to the given
   * default value if it is null. See Firebase.get.
   */
  Firebase.getWithDefault = function (ref, defaultValue, createValueFromSnapshot) {
    return Firebase.get(ref, createValueFromSnapshot).then(function (value) {
      return value == null ? defaultValue : value;
    });
  };

  /**
   * Sets the value of the given ref with an optional priority. Returns a
   * promise that resolves to the location reference when the sync is complete.
   */
  Firebase.set = function (ref, object, priority) {
    var deferred = RSVP.defer();
    var value = getFirebaseValue(object);

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
    var deferred = RSVP.defer();
    var value = getFirebaseValue(object);

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
   * Updates the given ref using the update callback in a transaction.
   */
  Firebase.transaction = function (ref, updateCallback, createValueFromSnapshot) {
    createValueFromSnapshot = createValueFromSnapshot || getSnapshotValue;

    var deferred = RSVP.defer();

    ref.transaction(updateCallback, function (error, committed, snapshot) {
      if (error) {
        deferred.reject(error);
      } else {
        deferred.resolve(createValueFromSnapshot(snapshot));
      }
    });

    return deferred.promise;
  };

  /**
   * Create a child of the given reference. If childName is given it will be the
   * name of the child reference. If a formatArgs array is given, childName is
   * treated as a string format. If any of formatArgs have an `id` property it is
   * interpolated automatically, e.g. the following have identical results:
   *
   *   Firebase.child(ref, 'users/%@/sessions', [ user ]);
   *   Firebase.child(ref, 'users/%@/sessions', [ user.id ]);
   *
   * If no `childName` is given a new child is automatically generated using `push`.
   *
   * See https://www.firebase.com/docs/javascript/firebase/child.html
   * and https://www.firebase.com/docs/javascript/firebase/push.html
   */
  Firebase.child = function (ref, childName, formatArgs) {
    if (childName) {
      if (formatArgs)
        return ref.child(fmt(childName, map(formatArgs, getId)));

      return ref.child(childName);
    }

    return ref.push();
  };

  function getId(object) {
    return get(object, 'id') || object;
  }

  /**
   * An Ember.Binding subclass that is able to bind an object property to
   * the value at a Firebase location reference. A Firebase.Binding should
   * be able to replace any instance of Ember.Binding, e.g.:
   *
   *   var valueRef = new Firebase('https://my-firebase.firebaseio.com/my/value');
   *
   *   var MyObject = Ember.Object.extend({
   *     value: null,
   *     valueBinding: Firebase.Binding.oneWay(valueRef)
   *   });
   */
  Firebase.Binding = Binding;

  function Binding(to, fromRef) {
    Ember.Binding.call(this, to, fromRef);
    this._objects = Ember.A();
  }

  Binding.prototype = Ember.create(Ember.Binding.prototype);

  Ember.merge(Binding.prototype, {

    constructor: Binding,

    /**
     * Used to coerce the value from a snapshot when the ref value changes.
     * See Firebase.Proxy#createValueFromSnapshot.
     */
    createValueFromSnapshot: getSnapshotValue,

    /**
     * Creates a copy of this binding. Used by Ember when a binding is setup
     * as part of a prototype to create a separate binding for each instance.
     * See Ember.Binding#copy.
     */
    copy: function () {
      var copy = new Firebase.Binding(this._to, this._from);

      if (this._oneWay)
        copy._oneWay = true;

      return copy;
    },

    /**
     * Connects this binding to the given object. See Ember.Binding#connect.
     */
    connect: function (object) {
      this._objects.addObject(object);

      // Observe the ref for changes if we're not already.
      if (!this._observingFrom) {
        this._from.on('value', this.fromRefDidChange, this);
        this._observingFrom = true;
      }

      // Observe the path for changes if we're going both ways.
      if (!this._oneWay)
        Ember.addObserver(object, this._to, this, this.toDidChange);

      return this;
    },

    /**
     * Disconnects this binding from the given object. See Ember.Binding#disconnect.
     */
    disconnect: function (object) {
      this._objects.removeObject(object);

      // Stop observing the ref for changes if there are no more objects.
      if (get(this._objects, 'length') === 0 && this._observingFrom) {
        this._from.off('value', this.fromRefDidChange, this);
        this._observingFrom = false;
      }

      // Stop observing the path for changes if we're going both ways.
      if (!this._oneWay)
        Ember.removeObserver(object, this._to, this, this.toDidChange);

      // Prevent further syncing.
      this._directionMap.remove(object);

      return this;
    },

    fromRefDidChange: function (snapshot) {
      if (this._ignoringFrom) return;

      this._objects.forEach(function (object) {
        this._scheduleSync(object, 'fwd', snapshot);
      }, this);
    },

    _scheduleSync: function (object, direction, snapshot) {
      var directionMap = this._directionMap;
      var existingDirection = directionMap.get(object);

      // if we haven't scheduled the binding yet, schedule it
      if (!existingDirection) {
        Ember.run.schedule('sync', this, this._sync, object, snapshot);
        directionMap.set(object, direction);
      }

      // If both a "back" and "fwd" operation have been scheduled on the
      // same object, default to "fwd" so that it remains deterministic.
      if (existingDirection === 'back' && direction === 'fwd')
        directionMap.set(object, 'fwd');
    },

    _sync: function (object, snapshot) {
      if (object.isDestroyed) return;

      var log = Ember.LOG_BINDINGS;
      var to = this._to, fromRef = this._from;

      // Get the direction of the binding for the object we're syncing from.
      var directionMap = this._directionMap;
      var direction = directionMap.get(object);
      directionMap.remove(object);

      // If we're syncing from Firebase...
      if (direction === 'fwd') {
        var value = this.createValueFromSnapshot(snapshot);

        if (log)
          Ember.Logger.log(' ', this.toString(), '->', value, object);

        if (this._oneWay) {
          Ember.trySet(object, to, value);
        } else {
          Ember._suspendObserver(object, to, this, this.toDidChange, function () {
            Ember.trySet(object, to, value);
          });
        }

      // If we're syncing to Firebase...
      } else if (direction === 'back') {
        var value = getFirebaseValue(get(object, to));

        if (log)
          Ember.Logger.log(' ', this.toString(), '<-', value, object);

        // This works because Firebase triggers local updates synchronously.
        this._ignoringFrom = true;
        fromRef.set(value);
        this._ignoringFrom = false;
      }
    },

    toString: function() {
      var dirString = this._oneWay ? '->' : '<->';
      return fmt('<%@ %@ %@ %@>', [ this.constructor, this._from, dirString, this._to ]);
    }

  });

  Ember.merge(Binding, {

    /**
     * A high-level method for creating a new binding from a given ref that
     * is not yet connected to any objects. See Binding#from.
     */
    from: function () {
      var binding = new Firebase.Binding();
      return binding.from.apply(binding, arguments);
    },

    /**
     * A high-level method for creating a new binding to a given path that
     * is not yet connected to any objects. See Binding#to.
     */
    to: function () {
      var binding = new Firebase.Binding();
      return binding.to.apply(binding, arguments);
    },

    /**
     * A high-level method for creating a new one-way binding from the given
     * ref that is not yet connected to any object. See Binding.from and Binding#oneWay.
     */
    oneWay: function (ref) {
      return this.from(ref).oneWay();
    },

    toString: function () {
      return 'Firebase.Binding';
    }

  });

  /**
   * A high-level method for creating a new binding for the given path
   * and ref connected to the given object.
   */
  Firebase.bind = function (object, to, fromRef) {
    return new Firebase.Binding(to, fromRef).connect(object);
  };

  /**
   * A high-level method for creating a new one-way binding for the given path
   * and ref connected to the given object.
   */
  Firebase.oneWay = function (object, to, fromRef) {
    return new Firebase.Binding(to, fromRef).oneWay().connect(object);
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
    baseRef: Ember.computed('ref', function () {
      var ref = get(this, 'ref');
      return isFirebaseQuery(ref) ? ref.ref() : ref;
    }),

    /**
     * The Firebase URL for this proxy's location reference.
     */
    baseUrl: Ember.computed('baseRef', function () {
      var baseRef = get(this, 'baseRef');
      return baseRef && baseRef.toString();
    }),

    init: function () {
      this._super();

      // Since _setupRef may modify this proxy's content
      // we need to call it during the init event.
      // https://github.com/emberjs/ember.js/issues/3818
      Ember.addListener(this, 'init', this, this._setupRef, true);
    },

    willDestroy: function () {
      this._teardownRef();
      this._super();
    },

    _setupRef: Ember.observer('ref', function () {
      var ref = get(this, 'ref');

      if (ref) {
        ref.on('child_added', this.childWasAdded, this);
        ref.on('child_changed', this.childWasChanged, this);
        ref.on('child_removed', this.childWasRemoved, this);
        ref.on('child_moved', this.childWasMoved, this);
      }
    }),

    _teardownRef: Ember.beforeObserver('ref', function () {
      var ref = get(this, 'ref');

      if (ref) {
        ref.off('child_added', this.childWasAdded);
        ref.off('child_changed', this.childWasChanged);
        ref.off('child_removed', this.childWasRemoved);
        ref.off('child_moved', this.childWasMoved);
      }
    }),

    childWasAdded: Ember.K,
    childWasChanged: Ember.K,
    childWasRemoved: Ember.K,
    childWasMoved: Ember.K,

    /**
     * Creates a child reference using `Firebase.child` and this proxy's
     * `baseRef` along with any additional arguments.
     */
    childRef: function (childName) {
      var ref = get(this, 'baseRef');

      if (!ref)
        throw new Error(fmt('Cannot create child ref of %@, ref is missing', [ this ]));

      return Firebase.child(ref, childName, [].slice.call(arguments, 1));
    },

    /**
     * A convenience method for creating a promise for the value stored at the child
     * location with the given name. This is useful when you need to be sure you have
     * the current value for a property (e.g. when doing a synchronous-style read) and
     * it may not yet have loaded asynchronously.
     */
    getWithPromise: function (childName) {
      return Firebase.get(this.childRef(childName), this.createValueFromSnapshot.bind(this));
    },

    /**
     * Removes the value at this proxy's `baseRef`.
     */
    remove: function () {
      var ref = get(this, 'baseRef');

      if (!ref)
        throw new Error(fmt('Cannot remove %@, ref is missing', [ this ]));

      return Firebase.remove(ref);
    },

    /**
     * A hook that proxies use to coerce the value from a snapshot. By default
     * proxies do not store any property values in the content object that are
     * already defined on the proxy itself. This behavior may be overridden as
     * desired to form a tree of Hash/List objects for child locations.
     *
     * For example, to model an arbitrarily deep tree of objects that represent
     * every node underneath a given Firebase location, you could use something
     * like the following class:
     *
     *   var NestedHash = Firebase.Hash.extend({
     *
     *     unknownProperty: function (propertyName) {
     *       return NestedHash.create({ ref: this.childRef(propertyName) });
     *     },
     *
     *     createValueFromSnapshot: function (snapshot) {
     *       if (snapshot.hasChildren())
     *         return NestedHash.create({ ref: snapshot.ref() });
     *
     *       return this._super(snapshot);
     *     }
     *
     *   });
     */
    createValueFromSnapshot: getSnapshotValue,

    toString: function () {
      return fmt('<%@:%@>', [ this.constructor, get(this, 'baseUrl') ]);
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

    _setupRef: function () {
      set(this, 'content', {});
      this._super();
    },

    /**
     * Returns true if this hash has a child with the given name.
     *
     * Note: This method only checks local values. Thus it may not be
     * accurate when using a query to filter the data.
     */
    hasChild: function (childName) {
      return (childName in get(this, 'content'));
    },

    _setPropertyValueFromSnapshot: function (snapshot) {
      var propertyName = snapshot.name();

      // If the proxy already has a property with the same name as the
      // snapshot it will override its content's value, so ignore it.
      if (propertyName in this)
        return;

      set(get(this, 'content'), propertyName, this.createValueFromSnapshot(snapshot));
    },

    childWasAdded: function (snapshot) {
      this._setPropertyValueFromSnapshot(snapshot);
    },

    childWasChanged: function (snapshot) {
      this._setPropertyValueFromSnapshot(snapshot);
    },

    childWasRemoved: function (snapshot) {
      set(get(this, 'content'), snapshot.name(), undefined);
    },

    /**
     * Ember uses this method to set properties on objects when the property
     * is not already present. We use it to set values on the underlying ref
     * instead, which propagates those changes to all listeners synchronously.
     */
    setUnknownProperty: function (property, object) {
      var ref = get(this, 'baseRef');

      if (!ref)
        throw new Error(fmt('Cannot set property "%@" on %@, ref is missing', [ property, this ]));

      ref.child(property).set(getFirebaseValue(object));

      return object;
    },

    /**
     * A convenience method for setting a property value with the given priority.
     */
    setWithPriority: function (property, object, priority) {
      var ref = get(this, 'baseRef');

      if (!ref)
        throw new Error(fmt('Cannot set property "%@" on %@, ref is missing', [ property, this ]));

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
     * Returns a plain JavaScript object representation of this hash.
     */
    toJSON: function () {
      var json = {};

      var content = get(this, 'content');
      for (var property in content)
        json[property] = getFirebaseValue(get(content, property));

      return json;
    }

  });

  Firebase.Hash.reopenClass({

    toString: function () {
      return 'Firebase.Hash';
    }

  });

  /**
   * An Ember.ArrayProxy for a Firebase data structure that respects ordering of children.
   *
   * IMPORTANT: There is currently no way to atomically alter the ordering of children
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

    names: null,

    _setupRef: function () {
      set(this, 'content', Ember.A());
      set(this, 'names', Ember.A());
      this._super();
    },

    _teardownRef: function () {
      this._super();
      set(this, 'names', null);
    },

    /**
     * Returns true if this list has a child with the given name.
     *
     * Note: This method only checks local values. Thus it may not be
     * accurate when using a query to filter the data.
     */
    hasChild: function (childName) {
      return get(this, 'names').contains(childName);
    },

    /**
     * Returns the child name of the item at the given index.
     */
    childNameAt: function (index) {
      return get(this, 'names').objectAt(index);
    },

    _indexAfter: function (childName) {
      return childName ? get(this, 'names').indexOf(childName) + 1 : 0;
    },

    childWasAdded: function (snapshot, previousName) {
      var index = this._indexAfter(previousName);
      get(this, 'content').replace(index, 0, [ this.createValueFromSnapshot(snapshot) ]);
      get(this, 'names').replace(index, 0, [ snapshot.name() ]);
    },

    childWasChanged: function (snapshot, previousName) {
      var index = this._indexAfter(previousName);
      var value = this.createValueFromSnapshot(snapshot);

      // If createValueFromSnapshot returns the same object we can skip the replace.
      if (this.objectAt(index) !== value) {
        get(this, 'content').replace(index, 1, [ value ]);
        get(this, 'names').replace(index, 1, [ snapshot.name() ]);
      }
    },

    childWasRemoved: function (snapshot) {
      var index = get(this, 'names').indexOf(snapshot.name());

      if (index !== -1) {
        get(this, 'content').replace(index, 1);
        get(this, 'names').replace(index, 1);
      }
    },

    childWasMoved: function (snapshot, previousName) {
      var toIndex = this._indexAfter(previousName);
      var fromIndex = get(this, 'names').indexOf(snapshot.name());

      if (fromIndex !== toIndex) {
        if (fromIndex !== -1) {
          get(this, 'content').replace(fromIndex, 1);
          get(this, 'names').replace(fromIndex, 1);

          // Keep toIndex accurate since we just removed one.
          if (toIndex > fromIndex)
            toIndex -= 1;
        }

        get(this, 'content').replace(toIndex, 0, [ this.createValueFromSnapshot(snapshot) ]);
        get(this, 'names').replace(toIndex, 0, [ snapshot.name() ]);
      }
    },

    /**
     * All Ember.MutableArray methods use this method to modify the array proxy's
     * content. We use it to make modifications on the underlying ref instead which
     * propagates those changes to all listeners synchronously.
     */
    replaceContent: function (index, amount, objects) {
      var ref = get(this, 'baseRef');

      if (!ref)
        throw new Error(fmt('Cannot replace content of %@, ref is missing', [ this ]));

      // Remove objects that are being replaced.
      forEach(get(this, 'names').slice(index, index + amount), function (childName) {
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

      if (!ref)
        throw new Error(fmt('Cannot push object %@ on %@, ref is missing', [ object, this ]));

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
     * Returns a plain JavaScript object representation of this list.
     */
    toJSON: function () {
      var content = get(this, 'content');
      var names = get(this, 'names');

      var json = {};
      for (var i = 0, len = names.length; i < len; ++i)
        json[names[i]] = getFirebaseValue(content[i]);

      return json;
    }

  });

  Firebase.List.reopenClass({

    toString: function () {
      return 'Firebase.List';
    }

  });

  // The default function used to coerce the value from a snapshot.
  function getSnapshotValue(snapshot) {
    return snapshot.val();
  }

  // Returns a representation of the given object that is able to be saved
  // to a Firebase location.
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
