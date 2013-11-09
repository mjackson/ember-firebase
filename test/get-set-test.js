describe('Firebase.get and Firebase.set', function () {

  var getValue;
  function setupValue(value) {
    return Firebase.set(BASE_REF, value).then(function () {
      return Firebase.get(BASE_REF).then(function (value) {
        getValue = value;
      });
    });
  }

  describe('when there is no value at a ref', function () {
    beforeEach(function () {
      return setupValue(null);
    });

    it('returns null', function () {
      expect(getValue).to.equal(null);
    });
  });

  describe('when there is a value at a ref', function () {
    var value;
    beforeEach(function () {
      return setupValue(value = 'myValue');
    });

    it('returns the value', function () {
      expect(getValue).to.equal(value);
    });
  });

  describe('when a ref has children', function () {
    beforeEach(function () {
      return setupValue({ my: 'value' });
    });

    it('returns a Firebase.Object', function () {
      expect(getValue).to.be.instanceof(Firebase.Object);
    });
  });

});
