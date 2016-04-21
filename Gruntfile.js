module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-mocha-test');

  grunt.initConfig({
    mochaTest: {
      nyan: {
        options: {
          reporter: 'nyan',
          ui: 'bdd'
        },
        src: ['test/*.js', 'test/*/**.js']
      },
      spec: {
        options: {
          reporter: 'spec',
          ui: 'bdd'
        },
        src: ['test/*.js', 'test/*/**.js']
      }
    }
  });

  grunt.registerTask('test', 'mochaTest:nyan');
  grunt.registerTask('travis', 'mochaTest:spec');

};