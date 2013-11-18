module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-mocha-test');

  grunt.initConfig({
    mochaTest: {
      nyan: {
        options: {
          reporter: 'nyan',
          ui: 'tdd'
        },
        src: ['test/fflip.js']
      },
      spec: {
        options: {
          reporter: 'spec',
          ui: 'tdd'
        },
        src: ['test/fflip.js']
      }
    }
  });

  grunt.registerTask('test', 'mochaTest:nyan');
  grunt.registerTask('travis', 'mochaTest:spec');

};