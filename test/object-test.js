describe('Firebase.Object', function () {

  var ref = new Firebase('https://hum.firebaseio.com/');

  var object;
  function createObject(properties) {
    object = Firebase.Object.create({ ref: ref });

    if (properties) {
      object.setProperties(properties);
    }
  }

  beforeEach(function () {
    ref.set(object = null);
  });

  it('has the correct string representation', function () {
    expect(Firebase.Object + '').to.equal('Firebase.Object');
  });

  describe('that has no properties', function () {
    beforeEach(function () {
      createObject();
    });

    it('returns undefined on get', function () {
      expect(object.get('missingKey')).to.equal(undefined);
    });
  });

  describe('that has one property', function () {
    beforeEach(function () {
      createObject({ key: 'value' });
    });

    it('returns the correct value', function () {
      expect(object.get('key')).to.equal('value');
    });
  });

  describe('that is created from an existing ref', function () {
    beforeEach(function () {
      ref.set({ key: 'value' });
      createObject();
    });

    it('can get the values from that ref', function () {
      expect(object.get('key')).to.equal('value');
    });

    describe('when the key changes value', function () {
      beforeEach(function () {
        ref.child('key').set('anotherValue');
      });

      it('reflects the updated value', function () {
        expect(object.get('key')).to.equal('anotherValue');
      });
    });

    describe('when the ref changes value', function () {
      beforeEach(function () {
        ref.set({ otherKey: 'otherValue' });
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
      createObject();

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

});
