describe('Firebase.Array', function () {
  it('has the correct string representation', function () {
    expect(Firebase.Array + '').to.equal('Firebase.Array');
  });
});

describe('A Firebase.Array', function () {
  var RSVP = Ember.RSVP;

  var array;
  beforeEach(function () {
    array = Firebase.Array.create({ ref: BASE_REF });
    return Firebase.set(BASE_REF, null);
  });

  it('has the correct string representation', function () {
    expect(array + '').to.include('Firebase.Array');
    expect(array + '').to.include(array.get('ref').toString());
  });

  describe('with no objects', function () {
    it('has length 0', function () {
      expect(array.get('length')).to.equal(0);
    });
  });

  describe('with some objects that are not sorted', function () {
    var objects;
    beforeEach(function () {
      objects = [ 1, 2, 3 ];
      array.addObjects(objects);
    });

    it('has the correct length', function () {
      expect(array.get('length')).to.equal(objects.length);
    });

    it('contains all objects', function () {
      objects.forEach(function (object) {
        expect(array.contains(object)).to.equal(true);
      });
    });
  });

  describe('with some objects that are sorted by name', function () {
    var objects;
    beforeEach(function () {
      objects = [ 'a', 'b', 'c' ];
      var promises = objects.map(function (object) {
        return Firebase.set(array.get('ref').child(object), object);
      });

      return RSVP.all(promises);
    });

    it('has the correct length', function () {
      expect(array.get('length')).to.equal(objects.length);
    });

    it('contains the objects in order', function () {
      objects.forEach(function (object, index) {
        expect(array.objectAt(index)).to.equal(object);
      });
    });
  });

  describe('with some objects that are sorted by priority', function () {
    var objects;
    beforeEach(function () {
      objects = [ 'd', 'e', 'f' ];
      var promises = objects.map(function (object, index) {
        return Firebase.set(array.get('ref').child(object), object, index + 1);
      });

      return RSVP.all(promises);
    });

    it('has the correct length', function () {
      expect(array.get('length')).to.equal(objects.length);
    });

    it('contains the objects in order', function () {
      objects.forEach(function (object, index) {
        expect(array.objectAt(index)).to.equal(object);
      });
    });

    describe('when a priority changes', function () {
      beforeEach(function () {
        return Firebase.set(array.get('ref').child(objects[0]), objects[0], objects.length + 1);
      });

      it('preserves the correct order', function () {
        expect(array.get('lastObject')).to.equal(objects[0]);
      });
    });

    describe('when a new object is inserted at a lower priority than all others', function () {
      beforeEach(function () {
        return Firebase.set(array.get('ref').child('g'), 'g', 0);
      });

      it('preserves the correct order', function () {
        expect(array.objectAt(3)).to.equal('f');
        expect(array.objectAt(2)).to.equal('e');
        expect(array.objectAt(1)).to.equal('d');
        expect(array.objectAt(0)).to.equal('g');
      });
    });
  });

  describe('with a limit', function () {
    var query, limit, objects;
    beforeEach(function () {
      query = BASE_REF.limit(limit = 3);
      array = Firebase.Array.create({ ref: query });

      objects = [ 'a', 'b', 'c' ];
      var promises = objects.map(function (object) {
        return Firebase.set(BASE_REF.child(object), object);
      });

      return RSVP.all(promises);
    });

    it('has the correct length', function () {
      expect(array.get('length')).to.equal(objects.length);
    });

    describe('when an object is added', function () {
      var childRef;
      beforeEach(function () {
        return Firebase.set(childRef = BASE_REF.child('d'), 'd');
      });

      it('limits the length', function () {
        expect(array.get('length')).to.equal(limit);
      });

      describe('and then removed', function () {
        beforeEach(function () {
          return Firebase.set(childRef, null);
        });

        it('preserves the length', function () {
          expect(array.get('length')).to.equal(objects.length);
        });
      });
    });
  });

  describe('pushObjectWithPriority', function () {
    beforeEach(function () {
      array.pushObjectWithPriority(1, 1);
      array.pushObjectWithPriority(1, 2);
      array.pushObjectWithPriority(2, 0);
    });

    it('unconditionally adds objects', function () {
      expect(array.get('length')).to.equal(3);
    });

    it('adds objects in the correct order', function () {
      expect(array.get('firstObject')).to.equal(2);
    });
  });

});
