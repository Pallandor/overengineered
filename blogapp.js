var moment = require('moment');
var Github = require('github-api');
console.log('now testing alert, but also extending btn states but not displaying');

// for managing submit btn states, EXTEND THIS LATER for managing state of the add blog post, back to blog posts btn states. 
var states = {
    btn: {
        submit: {
            normal: 'Submit Post',
            loading: '<i class="fa fa-refresh fa-spin"></i> Processing Request'
        },
        addBack: {
            onBlog: {
                text: 'Add Blog Post',
                //currentLocation: 
            },
            onForm: {
                text: 'Back to Blog Posts'
            }
        }
    },
    alert: {
        success: '<div class="alert alert-success" role="alert">You have successfully submitted your blog post!</div>',
        fail: '<div class="alert alert-warning" role="alert">Oops! Something went wrong, you should try again!/div>'
    }
};

var table = {
    localPostsTotal: null,
    render: function tableRenderer() {
        var blog, that = this;

        $.get('/database.json', function(data) {
            blog = typeof data === 'string' ? JSON.parse(data) : data;

            // if table has rendered before, only render new posts. 
            that.localPostsTotal && (blog.blogPosts = blog.blogPosts.slice(that.localPostsTotal));

            // Minimise DOM ops while rendering by composing new changes to str rather than changing DOM per new post 
            var str = '';
            // blog.blogPosts.forEach(function(post) {
            //     str += '<tr><th>' + post.number + '</th><td>' + post.date + '</td><td>' + post.content + '</td></tr>';
            // });

            //Render table earliest to oldest
            for (var i = blog.blogPosts.length - 1; i >= 0; i--) {
                var post = blog.blogPosts[i];
                str += '<tr><th>' + post.number + '</th><td>' + post.date + '</td><td>' + post.content + '</td></tr>';
            }

            // Visualising render ops
            // [p1, p2, p3]     START    p3p2p1   prepend
            // [p1, p2, p3, p4, p5]     p5p4    prepend
            $('.blog-table').prepend(str);

            that.localPostsTotal = blog.totalBlogPosts;
        });
    },
    add: function(formContent) {

        var github = new Github({
            token: formContent.token,
            auth: 'oauth'
        });

        var repo = github.getRepo('Pallandor', 'Pallandor.github.io');

        var options = {
            author: { name: 'Pallandor', email: 'roger.sejas@gmail.com' },
            committer: { name: 'Pallandor', email: 'roger.sejas@gmail.com' },
            encode: true
        };

        repo.read('master', 'database.json', function(err, existingBlog) {
            if (err) throw err;

            existingBlog.blogPosts.push({
                number: existingBlog.nextBlogNumber,
                date: moment().format('MMMM Do YYYY, h:mm:ss'),
                title: formContent.title,
                content: formContent.post
            });

            existingBlog.totalBlogPosts++;
            existingBlog.nextBlogNumber++;
            existingBlog = JSON.stringify(existingBlog);

            repo.write('master', 'database.json', existingBlog, 'Adding new blog post', options, function(err) {
                if (err) {
                    $('.result-container').html(states.alert.fail);
                    throw err;
                }
                // change to modals once this works. 
                $('.result-container').html(states.alert.success);
                $('.result-container').show();

                $('.submit-button').html(states.btn.submit.normal);
                $('form')[0].reset();
                $('.form-group').show();
            });
        });

    }

};

$(function() {

    // Start polling for updates
    var pollDatabase = function() {
        table.render();
        setTimeout(pollDatabase, 5000);
    };
    pollDatabase();

    var s = { text: 'Back to Blog Posts', data: 'on-submit-page' },
        v = { text: 'Add Blog Post', data: 'on-viewing-page' };

    $('.show-form').data(v);

    $('.show-form').on('click', function() {
        var page = $('.show-form').data();

        if (page.data === 'on-viewing-page') { // i.e. going to submit-page
            $('table').hide();
            $('form')[0].reset(); //grab 1st dom element. 
            $('form').show();
            $('.show-form').text(s.text); // Someone mentioned not to use .text due to mem leaks? Why? 
            $('.show-form').data(s);
        } else { //i.e. going to viewing-page
            $('form').hide();
            $('.result-container').hide(); // don't toggle. make explicit shows/hides. 
            $('table').show();
            $('.show-form').text(v.text);
            $('.show-form').data(v);
        }

    });

    $('form').on('submit', function(event) {
        $('.form-group').hide();
        $('.submit-button').html(states.btn.submit.loading);

        event.preventDefault();

        // Pass data as JS obj to table engine
        var formContent = {
            title: $('#input-title').val(),
            post: $('#input-blog').val(),
            token: $('#input-token').val()
        };
        table.add(formContent);
    });
});
