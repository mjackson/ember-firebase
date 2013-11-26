describe('Firebase.get and Firebase.set', function () {

  var result;
  function setupValue(value) {
    return Firebase.set(BASE_REF, value)
      .then(Firebase.get)
      .then(function (value) {
        result = value;
      });
  }

  describe('when there is no value', function () {
    beforeEach(function () {
      return setupValue(null);
    });

    it('returns null', function () {
      expect(result).to.equal(null);
    });
  });

  describe('when a string value is set', function () {
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
        myObject: { a: 'value' }
      });
    });

    it('returns a Firebase.Hash', function () {
      expect(result).to.be.instanceof(Firebase.Hash);
    });

    it('returns a Firebase.Hash for a nested object', function () {
      expect(result.get('myObject')).to.be.instanceof(Firebase.Hash);
    });
  });

  describe('when an array is set', function () {
    beforeEach(function () {
      return setupValue([ 1, 2, 3 ]);
    });

    it('returns a Firebase.Hash', function () {
      expect(result).to.be.instanceof(Firebase.Hash);
    });
  });

});

describe('Firebase.update', function () {

  var result;
  function setupValue(value) {
    return Firebase.update(BASE_REF, value)
      .then(Firebase.get)
      .then(function (value) {
        result = value;
      });
  }

  describe('when an object is set', function () {
    beforeEach(function () {
      return setupValue({ a: 'b', c: 'd' });
    });

    it('returns a Firebase.Hash', function () {
      expect(result).to.be.instanceof(Firebase.Hash);
    });

    it('reflects the updated values', function () {
      expect(result.get('a')).to.equal('b');
      expect(result.get('c')).to.equal('d');
    });

    describe('and another object updates some keys', function () {
      beforeEach(function () {
        return setupValue({ a: 'z' });
      });

      it('returns a Firebase.Hash', function () {
        expect(result).to.be.instanceof(Firebase.Hash);
      });

      it('preserves old values', function () {
        expect(result.get('c')).to.equal('d');
      });

      it('reflects the updated values', function () {
        expect(result.get('a')).to.equal('z');
      });
    });
  });

});