module.exports = function (grunt) {

    // load plugins
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-bower-task');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-processhtml');

    // config
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        vendordir: 'assets/vendor',
        distdir: 'dist',
        bowerdir: 'bcomps',
        clean: {
            build: ['<%= distdir %>'],
            vendor: ['<%= vendordir %>'],
            bower: ['<%= bowerdir %>']
        },
        copy: {
            vendor: {
                files: [{
                    src: ['<%= bowerdir %>/angular*/angular*.js', '<%= bowerdir %>/angular-bootstrap/ui-bootstrap-tpls*.js',
                        '<%= bowerdir %>/bootstrap/dist/js/*.js', '<%= bowerdir %>/clipboard/dist/*.js',
                        '<%= bowerdir %>/jquery/dist/jquery.min.js', '<%= bowerdir %>/angular-xeditable/dist/js/*.js'],
                    dest: '<%= vendordir %>/libs',
                    flatten: true,
                    filter: 'isFile',
                    expand: true
                }, {
                    src: ['<%= bowerdir %>/bootstrap/dist/css/*', '<%= bowerdir %>/angular-xeditable/dist/css/*'],
                    dest: '<%= vendordir %>/css',
                    flatten: true,
                    filter: 'isFile',
                    expand: true
                }, {
                    src: ['<%= bowerdir %>/bootstrap/dist/fonts/*'],
                    dest: '<%= vendordir %>/fonts',
                    flatten: true,
                    filter: 'isFile',
                    expand: true
                }]
            },
            build: {
                files: [{
                    src: 'index.html',
                    dest: '<%= distdir %>/index.html'
                }, {
                    src: 'app/**/*.html',
                    dest: '<%= distdir %>',
                    flatten: false,
                    filter: 'isFile',
                    expand: true
                },{
                    src: 'assets/**',
                    dest: '<%= distdir %>',
                    expand: true
                }]
            }
        },
        concat: {
            build: {
                src: ['app/**/*.js', 'app/app.js'],
                dest: '<%= distdir %>/app/app.js'
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> v.<%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd") %> */\n',
                mangle: false
            },
            build: {
                files: {
                    '<%= distdir %>/app/app.min.js': '<%= distdir %>/app/app.js'
                }
            }
        },
        cssmin: {
            build: {
                files: [{
                    expand: true,
                    cwd: '<%= distdir %>/assets/css',
                    src: ['*.css', '!*.min.css'],
                    dest: '<%= distdir %>/assets/css',
                    ext: '.min.css'
                }]
            }
        },
        bower: {
            options: {
                targetDir: '<%= bowerdir %>'
            },
            install: {

            }
        },
        processhtml: {
            build: {
                files: {
                    '<%= distdir %>/index.html': '<%= distdir %>/index.html'
                }
            }
        }
    });

    // Prepare environment and install dependencies
    grunt.registerTask('install-deps', ['bower', 'clean:vendor', 'copy:vendor']);
    // build
    grunt.registerTask('build', ['clean:build', 'copy:build', 'concat:build', 'uglify:build', 'cssmin:build', 'processhtml:build']);

};