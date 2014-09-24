var fs = require('fs')
  , path = require('path')
  , url = require('url')
  , assert = require('assert')
  , clone = require('clone')
  , jsonld = require('jsonld')
  , SchemaOrgIo = require('..');

var root = path.dirname(__filename);

describe('schema-org-io', function(){

  describe('jsonld context', function(){
    it('should standardize a JSONLD doc with the vanilla context', function(done){
      var doc = {
        "@context": SchemaOrgIo.context(),
        "@id": "myNameSpace",
        encoding: {contentUrl: 'http://example.com/data'},
        distribution: {name: "name"},
        hasPart: {'@id': 'http://example.com/part'}
      };

      jsonld.compact(doc, doc['@context'], function(err, cdoc){
        assert.equal(cdoc['@id'], 'ldr:myNameSpace');
        assert.deepEqual(cdoc.encoding, [doc.encoding]);
        assert.deepEqual(cdoc.distribution, [doc.distribution]);
        assert.deepEqual(cdoc.hasPart, [doc.hasPart['@id']]);
        done();
      });
    });
  });

  describe('SchemaOrgIo', function(){
    var packager;
    before(function(){
      packager = new SchemaOrgIo();
    });

    it('should have well initialized this.propMap', function(){
      assert.deepEqual(packager.propMap['valueReference'], {
        domains: [ 'QualitativeValue', 'QuantitativeValue' ],
        ranges: [ 'Enumeration', 'StructuredValue' ]
      });
    });

    it('should have well initialized this.propMap with extra :ldrterms', function(){
      assert.deepEqual(packager.propMap['hasPart'], {
        domains: [ 'CreativeWork' ],
        ranges: [ 'CreativeWork' ]
      });
    });

    it('should have well initialized this.classMap', function(){
      assert.deepEqual(packager.classMap['MedicalScholarlyArticle'], {
        subClasses: [ 'ScholarlyArticle' ],
        subClassesChain: [ 'ScholarlyArticle', 'Article', 'CreativeWork', 'Thing' ]
      });
    });

    it.only('should return the subclasses of a className', function(){
      assert.deepEqual(packager.getSubClasses('Article'), [ 'APIReference', 'BlogPosting', 'MedicalScholarlyArticle', 'NewsArticle', 'ScholarlyArticle', 'TechArticle' ]);
    });

    it('should throw an error for invalid @id', function(){
      ['nobase', '.a', 'wrongprefix:a', 'ldr:/../', '../', 'ldr:/ns@version', 'ldr:cw%40version'].forEach(function(invalidId){
        assert.throws( function(){ packager.validateId(invalidId); }, Error );
      });
    });

    it('should throw an error for an invalid namespace @id', function(){
      ['ldr:cw/nons', 'https://dcat.io/cw/nons'].forEach(function(invalidId){
        assert.throws( function(){ packager.validateId(invalidId, {isNameSpace: true}); }, Error );
      });
    });

    it('should validate @id and return a normalized version', function(){
      assert.equal(packager.validateId('https://dcat.io/cw'), 'ldr:cw');
      assert.equal(packager.validateId('ldr:cw'), 'ldr:cw');
      assert.equal(packager.validateId('https://dcat.io/cw/a'), 'ldr:cw/a');
      assert.equal(packager.validateId('ldr:cw/a'), 'ldr:cw/a');
    });

    it('should add @id', function(){
      var doc = {
        "@context": "https://dcat.io",
        "@id": "ldr:cw",
        "version": "0.0.0",
        "name": 'myname',
        "author": { "name": "peter" },
        "encoding": { "name": "enc" },
        "hasPart": [
          { "@id": "ldr:cw/n1",  "name": "part a" },
          { "name": "part b" },
          { "name": "part c" }
        ]
      };

      packager.setIds(doc);

      assert.equal(doc['@id'], 'ldr:cw');
      assert.equal(doc.author['@id'], 'ldr:cw/n0');
      assert.equal(doc.encoding['@id'], 'ldr:cw/n2');
      assert.equal(doc.hasPart[0]['@id'], 'ldr:cw/n1');
      assert.equal(doc.hasPart[1]['@id'], 'ldr:cw/n3');
      assert.equal(doc.hasPart[2]['@id'], 'ldr:cw/n4');
    });

    it('should add @id and respect options', function(){
      var doc = {
        "@context": "https://dcat.io",
        "@id": "ldr:cw",
        "version": "0.0.0",
        "author": { "name": "peter" },
        "encoding": { "name": "enc" },
      };

      var mdoc = packager.setIds(clone(doc), {ignoredProps: ['encoding'], restrictToClasses: ['CreativeWork']});
      assert.deepEqual(doc, mdoc);
    });

    it('should infer type of a node', function(){
      var obj = {
        "name": "enc",
        "videoQuality": "bad",
        "transcript": "a transcript"
      };
      assert.equal(packager.getType(obj), 'VideoObject');
    });

    it('should add types to a document', function(){

      var doc = {
        "name": 'myname',
        "author": { "givenName": "peter" },
        "encoding": { "name": "enc" },
        "hasPart": [
          { "name": "a part" }
        ]
      };

      var mdoc = packager.type(clone(doc), ['Article']);
      assert.equal(mdoc['@type'], 'Article');
      assert.equal(mdoc.author['@type'], 'Person');
      assert.equal(mdoc.hasPart[0]['@type'], 'CreativeWork');
    });

  });

});
