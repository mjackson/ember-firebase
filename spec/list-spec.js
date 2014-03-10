describe('Firebase.List', function () {
  it('has the correct string representation', function () {
    expect(Firebase.List + '').to.equal('Firebase.List');
  });
});

describe('A Firebase.List', function () {

  var list;
  beforeEach(function () {
    list = Firebase.List.create({ ref: BASE_REF });
  });

  it('has the correct string representation', function () {
    expect(list + '').to.include('Firebase.List');
    expect(list + '').to.include(list.get('baseUrl'));
  });

  describe('when converted to a hash', function () {
    var hash;
    beforeEach(function () {
      hash = list.toHash();
    });

    it('becomes a Firebase.List', function () {
      expect(hash).to.be.instanceof(Firebase.Hash);
    });
  });

  describe('with no objects', function () {
    it('has length 0', function () {
      expect(list.get('length')).to.equal(0);
    });
  });

  describe('with objects that are not ordered', function () {
    var objects;
    beforeEach(function () {
      objects = [ 1, 2, 3 ];
      list.addObjects(objects);
    });

    it('has the correct length', function () {
      expect(list.get('length')).to.equal(objects.length);
    });

    it('contains all objects', function () {
      objects.forEach(function (object) {
        expect(list.contains(object)).to.equal(true);
      });
    });

    describe('when an object is added', function () {
      beforeEach(function () {
        list.addObject(4);
        objects.push(4);
      });

      it('has the correct length', function () {
        expect(list.get('length')).to.equal(objects.length);
      });
    });

    describe('when cleared', function () {
      beforeEach(function () {
        list.clear();
      });

      it('has length 0', function () {
        expect(list.get('length')).to.equal(0);
      });
    });
  });

  describe('with objects that are ordered by name', function () {
    var objects;
    beforeEach(function () {
      objects = [ 'a', 'b', 'c' ];
      list.pushObjects(objects);
    });

    it('has the correct length', function () {
      expect(list.get('length')).to.equal(objects.length);
    });

    it('contains the objects in order', function () {
      objects.forEach(function (object, index) {
        expect(list.objectAt(index)).to.equal(object);
      });
    });
  });

  describe('with objects that are ordered by priority', function () {
    var objects;
    beforeEach(function () {
      objects = [ 'd', 'e', 'f' ];

      objects.forEach(function (object, index) {
        list.pushWithPriority(object, index + 1);
      });
    });

    it('has the correct length', function () {
      expect(list.get('length')).to.equal(objects.length);
    });

    it('contains the objects in order', function () {
      objects.forEach(function (object, index) {
        expect(list.objectAt(index)).to.equal(object);
      });
    });

    describe('when a priority changes', function () {
      beforeEach(function () {
        return Firebase.set(list.childRef(objects[0]), objects[0], objects.length + 1);
      });

      it('preserves the correct order', function () {
        expect(list.get('lastObject')).to.equal(objects[0]);
      });
    });

    describe('when a new object is inserted at a lower priority than all others', function () {
      beforeEach(function () {
        return Firebase.set(list.childRef('g'), 'g', 0);
      });

      it('preserves the correct order', function () {
        expect(list.objectAt(0)).to.equal('g');
        expect(list.objectAt(1)).to.equal('d');
        expect(list.objectAt(2)).to.equal('e');
        expect(list.objectAt(3)).to.equal('f');
      });
    });
  });

  describe('with a limit', function () {
    var limit, objects;
    beforeEach(function () {
      objects = [ 'a', 'b', 'c' ];
      list = Firebase.List.create({ ref: BASE_REF.limit(limit = 3) });
      list.pushObjects(objects);
    });

    it('has the correct length', function () {
      expect(list.get('length')).to.equal(objects.length);
    });

    describe('when an object is added', function () {
      var childRef;
      beforeEach(function () {
        return Firebase.push(list.get('baseRef'), 'd').then(function (ref) {
          childRef = ref;
        });
      });

      it('limits the length', function () {
        expect(list.get('length')).to.equal(limit);
      });

      describe('and then removed', function () {
        beforeEach(function () {
          return Firebase.remove(childRef);
        });

        it('preserves the length', function () {
          expect(list.get('length')).to.equal(objects.length);
        });
      });
    });
  });

  describe('pushWithPriority', function () {
    beforeEach(function () {
      list.pushWithPriority(1, 2);
      list.pushWithPriority(1, 3);
      list.pushWithPriority(2, 1);
    });

    it('unconditionally adds objects', function () {
      expect(list.get('length')).to.equal(3);
    });

    it('adds objects in the correct order', function () {
      expect(list.get('firstObject')).to.equal(2);
    });
  });

});
