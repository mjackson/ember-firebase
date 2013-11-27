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

      it('gets a Firebase.Hash', function () {
        expect(hash.get('key')).to.be.instanceof(Firebase.Hash);
      });
    });

    describe('with an array value', function () {
      beforeEach(function () {
        hash.set('key', [ 1, 2, 3 ]);
      });

      it('gets a Firebase.Hash', function () {
        expect(hash.get('key')).to.be.instanceof(Firebase.Hash);
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
