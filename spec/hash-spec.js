describe('Firebase.Hash', function () {
  it('has the correct string representation', function () {
    expect(Firebase.Hash + '').to.equal('Firebase.Hash');
  });
});

describe('A Firebase.Hash', function () {

  var hash;
  beforeEach(function () {
    hash = Firebase.Hash.create({ ref: BASE_REF });
  });

  it('has the correct string representation', function () {
    expect(hash + '').to.include('Firebase.Hash');
    expect(hash + '').to.include(hash.get('baseUrl'));
  });

  describe('when converted to a list', function () {
    var list;
    beforeEach(function () {
      list = hash.toList();
    });

    it('becomes a Firebase.List', function () {
      expect(list).to.be.instanceof(Firebase.List);
    });
  });

  describe('with no properties', function () {
    it('returns undefined on get', function () {
      expect(hash.get('missingKey')).to.equal(undefined);
    });
  });

  describe('when a property is set', function () {
    describe('with a string value', function () {
      beforeEach(function () {
        hash.set('key', 'value');
      });

      it('gets a string', function () {
        expect(hash.get('key')).to.equal('value');
      });
    });

    describe('with an object value', function () {
      beforeEach(function () {
        hash.set('key', { a: 'b', c: 'd' });
      });

      it('gets an object', function () {
        expect(typeof hash.get('key')).to.equal('object');
      });
    });

    describe('with an array value', function () {
      beforeEach(function () {
        hash.set('key', [ 1, 2, 3 ]);
      });

      it('gets an object', function () {
        expect(typeof hash.get('key')).to.equal('object');
      });
    });
  });

  describe('when the ref value is set directly', function () {
    beforeEach(function () {
      return Firebase.set(hash.get('ref'), { key: 'value' });
    });

    it('gets the correct value', function () {
      expect(hash.get('key')).to.equal('value');
    });

    describe('and the value changes', function () {
      beforeEach(function () {
        return Firebase.set(hash.get('ref').child('key'), 'anotherValue');
      });

      it('gets the updated value', function () {
        expect(hash.get('key')).to.equal('anotherValue');
      });
    });

    describe('and the ref value is set again', function () {
      beforeEach(function () {
        return Firebase.set(hash.get('ref'), { otherKey: 'otherValue' });
      });

      it('reflects the change', function () {
        expect(hash.get('key')).to.equal(undefined);
        expect(hash.get('otherKey')).to.equal('otherValue');
      });
    });

    describe('and then removed', function () {
      beforeEach(function () {
        return Firebase.remove(hash.get('ref').child('key'));
      });

      it('removes the value', function () {
        expect(hash.get('key')).to.equal(undefined);
      });
    });
  });

  describe('setWithPriority', function () {
    beforeEach(function () {
      hash.setWithPriority('key', 'value', 5);
    });

    it('gets the correct value', function () {
      expect(hash.get('key')).to.equal('value');
    });
  });

});

var CustomHash = Firebase.Hash.extend({

  key: 'default value'

});

describe('A Firebase.Hash subclass with default values', function () {

  var hash;
  beforeEach(function () {
    hash = CustomHash.create({ ref: BASE_REF });
  });

  describe('when a property with a default value is set', function () {
    beforeEach(function () {
      return Firebase.set(hash.get('ref').child('key'), 'custom value');
    });

    it('reflects the change', function () {
      expect(hash.get('key')).to.equal('custom value');
    });

    describe('and then removed', function () {
      beforeEach(function () {
        return Firebase.remove(hash.get('ref').child('key'));
      });

      it('returns the default value', function () {
        expect(hash.get('key')).to.equal('default value');
      });
    });
  });
});
