describe('Firebase.Hash', function () {
  it('has the correct string representation', function () {
    expect(Firebase.Hash + '').to.equal('Firebase.Hash');
  });
});

describe('A Firebase.Hash', function () {

  var object;
  beforeEach(function () {
    object = Firebase.Hash.create({ ref: BASE_REF });
    return Firebase.set(BASE_REF, null);
  });

  it('has the correct string representation', function () {
    expect(object + '').to.include('Firebase.Hash');
    expect(object + '').to.include(object.get('baseUrl'));
  });

  describe('with no properties', function () {
    it('returns undefined on get', function () {
      expect(object.get('missingKey')).to.equal(undefined);
    });
  });

  describe('when a property is set', function () {
    describe('with a string value', function () {
      beforeEach(function () {
        object.set('key', 'value');
      });

      it('gets a string', function () {
        expect(object.get('key')).to.equal('value');
      });
    });

    describe('with an object value', function () {
      beforeEach(function () {
        object.set('key', { a: 'b', c: 'd' });
      });

      it('gets a Firebase.Hash', function () {
        expect(object.get('key')).to.be.instanceof(Firebase.Hash);
      });
    });

    describe('with an array value', function () {
      beforeEach(function () {
        object.set('key', [ 1, 2, 3 ]);
      });

      it('gets a Firebase.Hash', function () {
        expect(object.get('key')).to.be.instanceof(Firebase.Hash);
      });

      describe('when converted to a list', function () {
        var list;
        beforeEach(function () {
          list = object.toList();
        });

        it('becomes a Firebase.List with the correct length', function () {
          expect(list).to.be.instanceof(Firebase.List);
          expect(list.get('length')).to.equal(1);
        });
      });
    });
  });

  describe('when the ref value is set directly', function () {
    beforeEach(function () {
      return Firebase.set(object.get('ref'), { key: 'value' });
    });

    it('gets the correct value', function () {
      expect(object.get('key')).to.equal('value');
    });

    describe('and the value changes', function () {
      beforeEach(function () {
        return Firebase.set(object.get('ref').child('key'), 'anotherValue');
      });

      it('gets the updated value', function () {
        expect(object.get('key')).to.equal('anotherValue');
      });
    });

    describe('and the ref value is set again', function () {
      beforeEach(function () {
        return Firebase.set(object.get('ref'), { otherKey: 'otherValue' });
      });

      it('reflects the change', function () {
        expect(object.get('key')).to.equal(undefined);
        expect(object.get('otherKey')).to.equal('otherValue');
      });
    });
  });

  describe('setWithPriority', function () {
    beforeEach(function () {
      object.setWithPriority('key', 'value', 5);
    });

    it('gets the correct value', function () {
      expect(object.get('key')).to.equal('value');
    });
  });

});
