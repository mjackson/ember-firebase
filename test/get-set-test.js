describe('Firebase.get and Firebase.set', function () {

  var result;
  function setupValue(value) {
    return Firebase.set(BASE_REF, value)
      .then(Firebase.get)
      .then(function (value) {
        result = value;
      });
  }

  describe('when there is no value at a ref', function () {
    beforeEach(function () {
      return setupValue(null);
    });

    it('returns null', function () {
      expect(result).to.equal(null);
    });
  });

  describe('when there is a value at a ref', function () {
    var value;
    beforeEach(function () {
      return setupValue(value = 'myValue');
    });

    it('returns the value', function () {
      expect(result).to.equal(value);
    });
  });

  describe('when an object is set', function () {
    beforeEach(function () {
      return setupValue({
        myString: 'value',
        myObject: { a: 'value' },
        myArray: Firebase.getArrayValue([ 1, 2, 3 ])
      });
    });

    it('returns a Firebase.Object', function () {
      expect(result).to.be.instanceof(Firebase.Object);
    });

    it('returns a Firebase.Object for a nested object', function () {
      expect(result.get('myObject')).to.be.instanceof(Firebase.Object);
    });

    it('returns a Firebase.Array for a nested array', function () {
      expect(result.get('myArray')).to.be.instanceof(Firebase.Array);
    });
  });

  describe('when an array is set', function () {
    beforeEach(function () {
      return setupValue(Firebase.getArrayValue([
        { a: 'value' },
        Firebase.getArrayValue([ 1, 2, 3 ])
      ]));
    });

    it('returns a Firebase.Array', function () {
      expect(result).to.be.instanceof(Firebase.Array);
    });

    it('returns a Firebase.Object for a nested object', function () {
      expect(result.objectAt(0)).to.be.instanceof(Firebase.Object);
    });

    it('returns a Firebase.Array for a nested array', function () {
      expect(result.objectAt(1)).to.be.instanceof(Firebase.Array);
    });
  });

});
