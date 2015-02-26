function b64_to_utf8(str) {
    return decodeURIComponent(escape(window.atob(str)));
};

marked.setOptions({
    highlight: function (code) {
        return hljs.highlightAuto(code).value;
    }
});

var github_content = "https://api.github.com/repos/zhsj/zhsj.github.io/contents";

var repo = 'zhsj/zhsj.github.io';
var github_api = 'https://api.github.com';

var temp;
var post_dir = "post";
var posts = [];
var posts_number = 0;
var posts_content = {};

var get_post = function(file_name, callback) {
    var post_prefix = github_content + '/' + post_dir + '/';
    $.get(post_prefix + file_name, function(data) {
        var markdown_content = b64_to_utf8(data.content);
        var html_content = marked(markdown_content);
        if(callback) {
            callback(html_content);
        }
    });
}

var post = function(filename) {
    var core = {
        'ajax' : function(filename, callback) {
            var url = github_api + '/repos/' + repo + '/contents/' + post_dir + '/' + filename;
            $.get(url)
            .done(function(data) {
                callback(marked(b64_to_utf8(data.content)));
            })
            .fail(function() {
                callback('<h1>404</h1>');
            });
        }
    };
    return {
        'show': function(selector) {
            core.ajax(filename, function(data) {
                $(selector).html(data);
            });
        }
    };
}

$(document).ready(function(){

    var url = location.href;
    var filename = url.match('#!post/(.*)');
    if(filename) {
        filename = filename[1];
        post(filename).show('#content');
        $('#sidebar').hide();
    }
    else {

        // get markdown file list
        $.get(github_content + '/' + post_dir, function(data) {

            posts_number = data.length;
            var posts_count = 0;
            data.forEach(function(element, index, array) {
                if(element.type == "file" && element.name.endsWith(".md")) {
                    posts.push(element.name);
                }
            });
            posts.forEach(function(element, index, array) {
                var sidebar_dom = $("<li />");
                sidebar_dom.html('<a href="#!post/' + element + '">' + element.replace('.md','') + '</a>');
                $("#sidebar ul").append(sidebar_dom);
            });
            post(posts[0]).show('#content');
            $('#sidebar a').click(function() {
                location.reload();
            });

        });
    }

});
