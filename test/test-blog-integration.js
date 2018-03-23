'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

// this makes the expect syntax available throughout
// this module
const expect = chai.expect;

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogData() {
  console.log('seeding blog data');
  const seedData = [];

  for (let i=0; i < 10; i++) {
    seedData.push(generateBlogData());
  };
  return BlogPost.insertMany(seedData);
}

function generateBlogData() {
  return {
    title: faker.lorem.words(),
    content: faker.lorem.paragraph(),
    author: {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName()
    },
    created: faker.date.past()
  };
}

function tearDownDb() {
  console.warn('Deleting database');
  return mongoose.connection.dropDatabase();
}

describe('Blog Post API resource', function() {

  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return seedBlogData();
  });

  afterEach(function() {
    return tearDownDb();
  });

  after(function() {
    return closeServer();
  });

  describe('GET endpoint', function() {
    it('should return all blog posts', function() {
      let res;
      return chai.request(app)
        .get('/posts')
        .then(function(_res) {
          res = _res;
          expect(res).to.have.status(200);
          return BlogPost.count();
        })
        .then(function(count) {
          expect(res.body).to.have.length.of(count);
        });
    });
  });

  describe('POST endpoint', function() {
    it('should add a new blog post', function() {
      const newPost = generateBlogData();

      return chai.request(app)
        .post('/posts')
        .send(newPost)
        .then(function(res) {
          expect(res).to.have.status(201);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.include.keys(
            'title', 'content', 'author', 'id');
          expect(res.body.title).to.equal(newPost.title);
          expect(res.body.id).to.not.be.null;
        });
    });
  });

  describe('PUT endpoint', function() {
    it('shouold update fields sent over', function() {
    const updateData = {
      title: "YAKAS LIFE STORY",
      content: "this is the life"
    };

    return BlogPost
      .findOne()
      .then(function(res) {
        updateData.id = res.id;

        return chai.request(app)
          .put(`/posts/${res.id}`)
          .send(updateData);
      })
      .then(function(res) {
        expect(res).to.have.status(200);
        return BlogPost.findById(updateData.id);
      })
      .then(function(res) {
        expect(res.title).to.equal(updateData.title);
        expect(res.content).to.equal(updateData.content);
      });
    });
  });

  describe('DELETE endpoint', function() {
    it('should delete a blog post by id', function() {
      let post;

      return BlogPost
        .findOne()
        .then(function(res) {
          post = res;
          return chai.request(app).delete(`/posts/${post.id}`);
        })
        .then(function(res) {
          expect(res).to.have.status(204);
          return BlogPost.findById(post.id);
        })
        .then(function(res) {
          expect(res).to.be.null;
        });
    });
  });
});
