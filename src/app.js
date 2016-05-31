var Sequelize = require('sequelize');
var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session');

// connect to the database
var sequelize = new Sequelize('tiffany', 'tiffany', null, {
	host: 'localhost',
	dialect: 'postgres',
	define: {
		timestamps: false
	}
});

//create table called users
var User = sequelize.define('user', {
	name: Sequelize.STRING,
	email: Sequelize.STRING,
	password: Sequelize.STRING
});

//create table called posts
var userPost = sequelize.define('post', {
	title: Sequelize.STRING,
	body: Sequelize.TEXT
});

//create table called comments
var userComment = sequelize.define('comment', {
	title: Sequelize.STRING,
	commentable: Sequelize.TEXT,
	commentable_id: Sequelize.INTEGER
});

// assigns user to posts
User.hasMany(userPost);
userPost.belongsTo(User);

// assigns user to comments
// User.hasMany(userComment);
// userComment.belongsTo(User);

// assigns comments to posts
userPost.hasMany(userComment);
userComment.belongsTo(userPost);

var app = express();

app.use(bodyParser.urlencoded({extended: true}));

app.use(session({ 
	secret: 'oh wow very secret much security',
	resave: true,
	saveUninitialized: false
}));

app.set('views', './src/views');
app.set('view engine', 'jade');

// initial login to create a session for the user and show blog
app.get('/', function (request, response) {
	userPost.findAll({ include: [ User ] }).then(function (posts) {
		console.log(posts)
		var data = posts.map(function (post) {
			return {
				title: post.dataValues.title,
				body: post.dataValues.body,
				username: post.dataValues.user.dataValues.name
			};
		})

		console.log("printing results:");
		console.log(data);

		response.render('index', {
		message: request.query.message, 
		user: request.session.user,
		blog: data.reverse()
	});
	});

});


// display a form to create a new user
app.get('/new', function (request, response) {
	response.render('new');
});

// create the new user
app.post('/users', bodyParser.urlencoded({extended: true}), function (request, response) {
	User.create({
		name: request.body.name,
		email: request.body.email,
		password: request.body.password
	}).then(function (user) {
		response.redirect('/profile');
	});
});


//creates new post
app.post('/blog', bodyParser.urlencoded({extended: true}), function (request, response) {
	User.findOne({
		where: {
		id: request.session.user.id
	}
	}).then(function(user) {
		user.createPost({
			title: request.body.title,
			body: request.body.body
		})
	}).then(function () {
		response.redirect('/profile');
	})
});

// shows profile and user posts
app.get('/profile', function (request, response) {
	var user = request.session.user;
	if (user === undefined) {
		response.redirect('/?message=' + encodeURIComponent("Please log in to access the blog.")); // makes the string URL friendly
	} else {

		userPost.findAll({
			where: {
				userId: user.id
			}
		}).then(function(posts) {
			var data = posts.map(function (post) {
				return {
					title: post.dataValues.title,
					body: post.dataValues.body
				}
			})
			response.render('profile', {
				user: user,
				blog: data.reverse()
			});
		});
	}
});



app.post('/login', bodyParser.urlencoded({extended: true}), function (request, response) {
	if(request.body.email.length === 0) {
		response.redirect('/?message=' + encodeURIComponent("Please fill out your email address.")); 
		return;
	}

	if(request.body.password.length === 0) {
		response.redirect('/?message=' + encodeURIComponent("Please fill out your password."));
		return;
	}

	User.findOne({
		where: {
			email: request.body.email
		}
	}).then(function (user) {
		if (user !== null && request.body.password === user.password) { // from the database
			request.session.user = user;
			response.redirect('/profile');
		} else {
			response.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
		}
	}, function (error) {
		response.redirect('/?message=' + encodeURIComponent("Invalid email or password."));
	});
});

app.get('/logout', function (request, response) {
	request.session.destroy(function(error) {
		if(error) {
			throw error;
		}
		response.redirect('/?message=' + encodeURIComponent("Successfully logged out."));
	})
});



sequelize.sync().then(function () {
	var server = app.listen(3000, function () {
		console.log('Example app listening on port: ' + server.address().port);
	});
});

