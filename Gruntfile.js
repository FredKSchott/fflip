module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-mocha-test');

  grunt.initConfig({
    mochaTest: {
      nyan: {
        options: {
          reporter: 'nyan',
          ui: 'bdd'
        },
        src: ['test/*']
      },
      spec: {
        options: {
          reporter: 'spec',
          ui: 'bdd'
        },
        src: ['test/*']
      }
    }
  });

  grunt.registerTask('test', 'mochaTest:nyan');
  grunt.registerTask('travis', 'mochaTest:spec');

};