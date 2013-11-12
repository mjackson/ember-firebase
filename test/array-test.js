describe('Firebase.Array', function () {
  it('has the correct string representation', function () {
    expect(Firebase.Array + '').to.equal('Firebase.Array');
  });
});

describe('A Firebase.Array', function () {

  var array;
  beforeEach(function () {
    array = Firebase.Array.create({ ref: BASE_REF });
    return Firebase.set(BASE_REF, null);
  });

  it('has the correct string representation', function () {
    expect(array + '').to.include('Firebase.Array');
    expect(array + '').to.include(array.get('baseUrl'));
  });

  describe('with no objects', function () {
    it('has length 0', function () {
      expect(array.get('length')).to.equal(0);
    });
  });

  describe('with objects that are not ordered', function () {
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

    describe('when cleared', function () {
      beforeEach(function () {
        array.clear();
      });

      it('has length 0', function () {
        expect(array.get('length')).to.equal(0);
      });
    });
  });

  describe('with objects that are ordered by name', function () {
    var objects;
    beforeEach(function () {
      objects = [ 'a', 'b', 'c' ];
      array.pushObjects(objects);
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

  describe('with objects that are ordered by priority', function () {
    var objects;
    beforeEach(function () {
      objects = [ 'd', 'e', 'f' ];

      objects.forEach(function (object, index) {
        array.pushObjectWithPriority(object, index + 1);
      });
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
        return Firebase.set(array.childRef(objects[0]), objects[0], objects.length + 1);
      });

      it('preserves the correct order', function () {
        expect(array.get('lastObject')).to.equal(objects[0]);
      });
    });

    describe('when a new object is inserted at a lower priority than all others', function () {
      beforeEach(function () {
        return Firebase.set(array.childRef('g'), 'g', 0);
      });

      it('preserves the correct order', function () {
        expect(array.objectAt(0)).to.equal('g');
        expect(array.objectAt(1)).to.equal('d');
        expect(array.objectAt(2)).to.equal('e');
        expect(array.objectAt(3)).to.equal('f');
      });
    });
  });

  describe('with a limit', function () {
    var limit, objects;
    beforeEach(function () {
      objects = [ 'a', 'b', 'c' ];
      array.limit(limit = 3).pushObjects(objects);
    });

    it('has the correct length', function () {
      expect(array.get('length')).to.equal(objects.length);
    });

    describe('when an object is added', function () {
      var childRef;
      beforeEach(function () {
        return Firebase.push(array.get('baseRef'), 'd').then(function (ref) {
          childRef = ref;
        });
      });

      it('limits the length', function () {
        expect(array.get('length')).to.equal(limit);
      });

      describe('and then removed', function () {
        beforeEach(function () {
          return Firebase.remove(childRef);
        });

        it('preserves the length', function () {
          expect(array.get('length')).to.equal(objects.length);
        });
      });
    });
  });

  describe('pushObjectWithPriority', function () {
    var returnValues;
    beforeEach(function () {
      returnValues = [
        array.pushObjectWithPriority(1, 1),
        array.pushObjectWithPriority(1, 2),
        array.pushObjectWithPriority(2, 0)
      ];
    });

    it('unconditionally adds objects', function () {
      expect(array.get('length')).to.equal(3);
    });

    it('adds objects in the correct order', function () {
      expect(array.get('firstObject')).to.equal(2);
    });

    it('returns a Firebase location reference', function () {
      returnValues.forEach(function (value) {
        expect(value).to.be.instanceof(Firebase);
      });
    });
  });

});
