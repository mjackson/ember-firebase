ember-firebase is a stable, [thoroughly-tested](https://github.com/mjijackson/ember-firebase/tree/master/test) set of [Firebase](https://www.firebase.com/index.html) bindings for [Ember.js](http://emberjs.com/).

### Firebase.Binding

`Firebase.Binding` is a subclass of `Ember.Binding` that allows you to bind directly to a Firebase location reference from an arbitrary object path. The binding can be either two-way or read-only. Use it anywhere you would normally use an `Ember.Binding`.

```js
var ref = new Firebase('https://my-firebase.firebaseio.com');
var connectedRef = ref.child('.info/connected');

var CurrentUserController = Ember.ObjectController.extend({

  // Tells whether or not the current user is connected to
  // the Firebase servers. Useful for managing presence.
  isConnected: false,

  // This binding keeps the isConnected property in sync
  // with the value at the .info/connected ref.
  isConnectedBinding: Firebase.Binding.oneWay(connectedRef)

});
```

Note: The `Firebase.Binding` API closely follows `Ember.Binding`, so things like `Firebase.Binding#connect`, `Firebase.Binding#disconnect`, `Firebase.bind` and `Firebase.oneWay` all work as you would expect.

### Firebase.Hash

`Firebase.Hash` is an `Ember.ObjectProxy` subclass that can be used to model data at a single Firebase location reference, including children. Use it anywhere you would normally use an `Ember.Object`.

You only need to give it a `ref` property that points to the Firebase location you want to sync with. When you set properties on the object they automatically sync to Firebase. When children of that location are updated in Firebase, they sync to your object.

```js
var ref = new Firebase('https://my-firebase.firebaseio.com');

var User = Firebase.Hash.extend({

  fullName: function () {
    return this.get('firstName') + ' ' + this.get('lastName');
  }.property('firstName', 'lastName')

});

var user = User.create({

  // The ref property points to the location where you want
  // to store the data for this object.
  ref: ref.child('users/mj'),

  // These properties will be set immediately and will sync
  // to the Firebase servers.
  firstName: 'Michael',
  lastName: 'Jackson'

});

user.get('fullName'); // => "Michael Jackson"
user.set('lastName', 'Johnson');
user.get('fullName'); // => "Michael Johnson"
```

### Firebase.List

`Firebase.List` is an `Ember.ArrayProxy` subclass that lets you store array-like data at a Firebase location. Use it anywhere you would normally use an `Ember.Array`.

When you create a new `Firebase.List`, you need to give it a `ref` property that it will use to sync with Firebase. Note: You can also use a [query](https://www.firebase.com/docs/javascript/query/index.html) here, e.g. to limit the number of items in the list.

```js
var ref = new Firebase('https://my-firebase.firebaseio.com');

var Messages = Firebase.List.extend();

var messages = Messages.create({

  // The ref property points to the location where you want
  // to store the data for this object.
  ref: ref.child('messages')

});

messages.pushObject({ text: 'Hello world!' });
messages.get('length'); // => 1
```

### Modeling Trees

`Firebase.Hash` and `Firebase.List` both create values using their `createValueFromSnapshot` method. This method is responsible for creating a JavaScript value to store in your object based on the [DataSnapshot object](https://www.firebase.com/docs/javascript/datasnapshot/index.html) received from Firebase.

The default implementation of this method simply returns `snapshot.val()`, but you can override it to do something more interesting. For example, you may be storing a list of ids that you'd like to convert to live proxy objects as ids are added to or removed from the list. Or you may want to model the nested data at a given location with a tree of proxy objects.

For example, the following `Firebase.Hash` subclass will recursively create a new instance of itself for every node in the tree.

```js
var NestedHash = Firebase.Hash.extend({

  createValueFromSnapshot: function (snapshot) {
    // If the snapshot has children, make another NestedHash to
    // represent the data at this location.
    if (snapshot.hasChildren()) {
      return NestedHash.create({ ref: snapshot.ref() });
    }

    return this._super(snapshot);
  }

});
```

### Creating Child References

`Firebase.child` makes it easy to create a new child reference from an existing reference. If no child name is given, a new one is automatically generated. Otherwise, the child name may be a plain string or a string format that is interpolated with the remaining arguments to the function. If any interpolated argument has an `id` property, it is automatically used.

```js
Firebase.child(ref);                       // same as ref.push()
Firebase.child(ref, 'myName');             // same as ref.child('myName')
Firebase.child(ref, 'chats/%@', chat.id);  // same as ref.child('chats/' + chat.id);
Firebase.child(ref, 'chats/%@', chat);     // same as ref.child('chats/' + chat.id);
```

### Query Methods

In addition to `Firebase.Binding`, `Firebase.Hash`, and `Firebase.List`, ember-firebase includes a suite of query methods that are useful for doing one-off queries. Each of these utility methods returns a [promise](http://emberjs.com/api/classes/Ember.RSVP.Promise.html) that resolves when the sync with the Firebase servers is complete.

```js
Firebase.get(ref).then(function (value) {
  // value is the value stored at the given ref
});

Firebase.getWithDefault(ref, defaultValue).then(function (value) {
  // value is the value stored at the given ref, or the
  // defaultValue if it was null
});

Firebase.set(ref, value).then(function () {
  // the set is sync'd to Firebase
});

Firebase.push(ref, value).then(function (newRef) {
  // the newRef is sync'd to Firebase
});

Firebase.remove(ref).then(function () {
  // the ref was removed from Firebase
});

Firebase.update(ref, { some: 'updates' }).then(function () {
  // the ref was updated with the given properties
});
```

### Tests

To run the tests, change the `BASE_REF` variable in `test/index.html` to point to any Firebase location you have read/write access to and open the file in a browser.

### License

[MIT](http://opensource.org/licenses/MIT)
