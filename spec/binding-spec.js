describe('Firebase.Binding', function () {

  var MyBoundObject = Ember.Object.extend({
    myValue: null,
    myValueBinding: Firebase.Binding.from(BASE_REF)
  });

  var object, path;
  beforeEach(function () {
    object = MyBoundObject.create();
    path = 'myValue';
  });

  it('has the correct string representation', function () {
    expect(Firebase.Binding + '').to.equal('Firebase.Binding');
  });

  describe('when used as the value for a property named *Binding', function () {
    describe('when the object path is set', function () {
      var pathValue, refValue;
      beforeEach(function (done) {
        BASE_REF.once('value', function (snapshot) {
          refValue = snapshot.val();
          done();
        });

        object.set(path, pathValue = 'a value');
      });

      it('propagates the change to the ref', function () {
        expect(refValue).to.equal(pathValue);
      });
    });

    describe('when the ref value is set', function () {
      var pathValue, refValue;
      beforeEach(function (done) {
        Ember.addObserver(object, path, function () {
          pathValue = object.get(path);
          done();
        });

        BASE_REF.set(refValue = 'another value');
      });

      it('propagates the change to the object', function () {
        expect(pathValue).to.equal(refValue);
      });
    });
  });

});

describe('Firebase.bind', function () {

  var MyObject = Ember.Object.extend({
    myValue: null
  });

  var object, path, binding;
  beforeEach(function () {
    object = MyObject.create();
    binding = Firebase.bind(object, path = 'myValue', BASE_REF);
  });

  describe('when the object path is set', function () {
    var pathValue, refValue;
    beforeEach(function (done) {
      BASE_REF.once('value', function (snapshot) {
        refValue = snapshot.val();
        done();
      });

      object.set(path, pathValue = 'a value');
    });

    it('propagates the change to the ref', function () {
      expect(refValue).to.equal(pathValue);
    });
  });

  describe('when the ref value is set', function () {
    var pathValue, refValue;
    beforeEach(function (done) {
      Ember.addObserver(object, path, function () {
        pathValue = object.get(path);
        done();
      });

      BASE_REF.set(refValue = 'another value');
    });

    it('propagates the change to the object', function () {
      expect(pathValue).to.equal(refValue);
    });
  });

});

describe('Firebase.oneWay', function () {

  var MyObject = Ember.Object.extend({
    myValue: null
  });

  var object, path, binding;
  beforeEach(function () {
    object = MyObject.create();
    binding = Firebase.oneWay(object, path = 'myValue', BASE_REF);
  });

  describe('when the object path is set', function () {
    var pathValue, refValue;
    beforeEach(function (done) {
      BASE_REF.once('value', function (snapshot) {
        refValue = snapshot.val();
        done();
      });

      object.set(path, pathValue = 'a value');
    });

    it('does not propagate the change to the ref', function () {
      expect(refValue).to.be.null;
    });
  });

  describe('when the ref value is set', function () {
    var pathValue, refValue;
    beforeEach(function (done) {
      Ember.addObserver(object, path, function () {
        pathValue = object.get(path);
        done();
      });

      BASE_REF.set(refValue = 'another value');
    });

    it('propagates the change to the object', function () {
      expect(pathValue).to.equal(refValue);
    });
  });

});
