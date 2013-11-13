ember-firebase is a stable, [thoroughly-tested](https://github.com/mjijackson/ember-firebase/tree/master/test) set of [Firebase](https://www.firebase.com/index.html) bindings for [Ember.js](http://emberjs.com/).

### Usage

ember-firebase includes two subclasses that let you manipulate a Firebase location reference in two different styles, depending on how you intend to use your data. `Firebase.Hash` is an `Ember.ObjectProxy` and `Firebase.List` is an `Ember.ArrayProxy`. Use `Firebase.Hash` when you are storing key/value-style data at a location reference, and `Firebase.List` when you're storing array-like data.

```js
var myRef = new Firebase('https://ember-firebase.firebaseio.com');

var hash = Firebase.Hash.create({ ref: myRef });

hash.set('myKey', 'myValue');
hash.get('myKey'); // "myValue"

hash.set('myKey', { my: 'value' });
hash.get('myKey'); // Firebase.Hash

hash.set('myKey', [ 1, 2, 3 ].toFirebaseValue());
hash.get('myKey'); // Firebase.List

hash.set('myKey', [ 1, 2, 3 ]);
hash.get('myKey'); // Firebase.Hash

var list = Firebase.List.create({ ref: myRef });

list.addObject('myValue');
list.get('length'); // 1
list.objectAt(0); // "myValue"

list.clear();
list.get('length'); // 0

list.pushWithPriority('second', 2);
list.pushWithPriority('first', 1);
list.objectAt(0); // "first"
list.objectAt(1); // "second"
```

You can convert easily between hashes and lists.

```js
var hash = Firebase.Hash.create({ ref: myRef });
var list = hash.toList();
var duplicateHash = list.toHash();
```

ember-firebase also includes several utility methods that make it convenient to get/set values at specific location references. These methods all return promises that are resolved once the sync with the Firebase servers is complete.

```js
Firebase.set(myRef, 'myValue').then(function () {
  // the value has been synced to Firebase
});

Firebase.get(myRef).then(function (value) {
  // value is the value at myRef
});

Firebase.push(myRef, 'myValue').then(function (childRef) {
  // childRef is a reference to the newly created child location
});

Firebase.remove(myRef).then(function (childRef) {
  // childRef points to a null location
});
```

### License

Please feel free to use this library under the terms of the [MIT license](http://opensource.org/licenses/MIT).
