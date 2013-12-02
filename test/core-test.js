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

  describe('when an empty object is set', function () {
    beforeEach(function () {
      return setupValue({});
    });

    it('returns null', function () {
      expect(result).to.be.null;
    });
  });

  describe('when an empty array is set', function () {
    beforeEach(function () {
      return setupValue([]);
    });

    it('returns null', function () {
      expect(result).to.be.null;
    });
  });

  describe('when an object is set', function () {
    beforeEach(function () {
      return setupValue({ a: 'value' });
    });

    it('returns an object', function () {
      expect(typeof result).to.equal('object');
    });
  });

  describe('when an array is set', function () {
    beforeEach(function () {
      return setupValue([ 1, 2, 3 ]);
    });

    it('returns an object', function () {
      expect(typeof result).to.equal('object');
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

    it('returns an object', function () {
      expect(typeof result).to.equal('object');
    });

    it('reflects the updated values', function () {
      expect(result.a).to.equal('b');
      expect(result.c).to.equal('d');
    });

    describe('and another object updates some keys', function () {
      beforeEach(function () {
        return setupValue({ a: 'z' });
      });

      it('returns an object', function () {
        expect(typeof result).to.equal('object');
      });

      it('preserves old values', function () {
        expect(result.c).to.equal('d');
      });

      it('reflects the updated values', function () {
        expect(result.a).to.equal('z');
      });
    });
  });

});

describe('Firebase.child', function () {

  var child, childString;
  function createChild(childName, formatArgs) {
    child = Firebase.child(BASE_REF, childName, formatArgs);
    childString = child.toString();
  }

  describe('when no arguments are given', function () {
    beforeEach(function () {
      createChild();
    });

    it('automatically creates a new reference', function () {
      expect(child).to.be.ok;
    });
  });

  describe('when interpolating path arguments', function () {
    describe("that don't have an id", function () {
      beforeEach(function () {
        createChild('%@/%@', [ 'my', 'path' ]);
      });

      it('creates the correct path', function () {
        expect(childString).to.contain('/my/path');
      });
    });

    describe('that have an id', function () {
      beforeEach(function () {
        createChild('%@/%@', [ { id: 'my' }, { id: 'path' } ]);
      });

      it('creates the correct path', function () {
        expect(childString).to.contain('/my/path');
      });
    });
  });
});
