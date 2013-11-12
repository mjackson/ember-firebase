describe('Firebase.Object', function () {
  it('has the correct string representation', function () {
    expect(Firebase.Object + '').to.equal('Firebase.Object');
  });
});

describe('A Firebase.Object', function () {

  var object;
  beforeEach(function () {
    object = Firebase.Object.create({ ref: BASE_REF });
    return Firebase.set(BASE_REF, null);
  });

  it('has the correct string representation', function () {
    expect(object + '').to.include('Firebase.Object');
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

      it('gets a Firebase.Object', function () {
        expect(object.get('key')).to.be.instanceof(Firebase.Object);
      });
    });

    describe('with an array value', function () {
      beforeEach(function () {
        object.set('key', [ 1, 2, 3 ]);
      });

      it('gets a Firebase.Object', function () {
        expect(object.get('key')).to.be.instanceof(Firebase.Object);
      });

      describe('when converted to an array', function () {
        beforeEach(function () {
          object = object.toArray();
        });

        it('becomes a Firebase.Array with the correct length', function () {
          expect(object).to.be.instanceof(Firebase.Array);
          expect(object.get('length')).to.equal(1);
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

});
