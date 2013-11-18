module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-mocha-test');

  grunt.initConfig({
    mochaTest: {
      test: {
        options: {
          reporter: 'nyan',
          ui: 'tdd'
        },
        src: ['test/fflip.js']
      }
    }
  });

  grunt.registerTask('test', 'mochaTest');

};