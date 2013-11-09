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
    expect(object + '').to.include(object.get('ref').toString());
  });

  describe('with no properties', function () {
    it('returns undefined on get', function () {
      expect(object.get('missingKey')).to.equal(undefined);
    });
  });

  describe('when a property is set', function () {
    beforeEach(function () {
      object.set('key', 'value');
    });

    it('get returns the correct value', function () {
      expect(object.get('key')).to.equal('value');
    });
  });

  describe('when the ref value is set', function () {
    beforeEach(function () {
      return Firebase.set(object.get('ref'), { key: 'value' });
    });

    it('get returns the correct value', function () {
      expect(object.get('key')).to.equal('value');
    });

    describe('when the key changes value', function () {
      beforeEach(function () {
        return Firebase.set(object.get('ref').child('key'), 'anotherValue');
      });

      it('get reflects the updated value', function () {
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

  describe('when setting nested properties', function () {
    var result;
    beforeEach(function () {
      result = object.set('key', {
        a: 'a',
        b: 'b',
        c: 'c'
      });
    });

    it('returns a new Firebase.Object', function () {
      expect(result).to.be.instanceof(Firebase.Object);
    });
  });

  describe('when setting a nested Firebase.Object', function () {
    var result;
    beforeEach(function () {
      var nestedObject = Firebase.Object.create({ ref: object.get('ref').child('firstKey') });
      nestedObject.set('a', 'b');
      nestedObject.set('c', 'd');

      result = object.set('secondKey', nestedObject);
    });

    it('returns a new Firebase.Object', function () {
      expect(result).to.be.instanceof(Firebase.Object);
    });

    it('sets the nested properties correctly', function () {
      expect(object.get('secondKey.a')).to.equal('b');
      expect(object.get('secondKey.c')).to.equal('d');
    });
  });

});
