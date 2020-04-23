//order these variables by name
var bodyParser   = require("body-parser"),  
methodOverride   = require("method-override"),
expressSanitizer = require("express-sanitizer"),
mongoose         = require("mongoose"),
express          = require("express"),
passport         = require("passport"),
localStrategy    = require("passport-local"),
passportLocalMongoose = require("passport-local-mongoose"),
app              = express(); 



// APP CONFIG
//configure mongoose
var url = process.env.DATABASEURL || "mongodb://localhost/yelp_camp";
mongoose.connect(url); 
app.set("view engine", "ejs"); 
app.use(express.static("public")); //tells express to serve the public directory
app.use(bodyParser.urlencoded({extended: true}));
app.use(expressSanitizer()); 
app.use(methodOverride("_method")); //argument is what it should look for in the url
app.use(express.static(__dirname + "/public"));



// DB FOR USER
var UsesSchema = new mongoose.Schema({
    username : String,
    email : String,
    number : Number,
    password : String
});

UsesSchema.plugin(passportLocalMongoose);
var User = mongoose.model("User", UsesSchema);




//PASSPORT CONFIGURATION
app.use(require("express-session")({
    secret: "This is the key to my hashings!",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());




// MONGOOSE/MODEL CONFIG
//create schema for mongoose (defining a pattern for data)
var blogSchema = new mongoose.Schema({
    title: String, 
    image: String, 
    body: String,
    created: {type: Date, default: Date.now} //says its type date, and it's default is date.now
});

//compile into model so we can use all of mongoose's wonderful methods to interact with mongodb
var Blog = mongoose.model("Blog", blogSchema); 
//mongoose.model(“Name of singular version of our model”, …) – will automatically make a collection of cats in our database. And also, mongo will pluralize Cat into “cats”

// test blog
// Blog.create({
//     title: "Test Blog", 
//     image: "https://source.unsplash.com/VRLHw_rBjIw",
//     body: "HELLO THIS IS A BLOG POST!"
// });

//Without the following middleware, the header tries to find currentUser
//As defined in "/campgrounds". It was not available to all routes,
//so .ejs files hand with currentUser as undefined, saying "esc is not a function"
app.use(function(req, res, next){
    res.locals.currentUser = req.user; //defines user for all routes
    next(); //middleware needs next to move onto next code
});


// RESTFUL ROUTES


app.get("/", function(req, res) {
    res.redirect("/blogs"); //conventional to redirect to the index
});

// INDEX ROUTE
app.get("/blogs", function(req, res) {
    //retrieving all blogs from DB
    Blog.find({}, function(err, blogs) {
        if (err) {
            console.log("ERROR!"); 
        }
        else {
            res.render("index", {blogs: blogs}); 
        }
    });
    
});

// NEW ROUTE
app.get("/blogs/new", isLoggedIn, function(req, res) {
    //just render the same form over and over - easiest route
    res.render("new"); 
});

// CREATE ROUTE
app.post("/blogs", function(req, res) {
    // create blog
    
    //this bottom line basically gets rid of all <script> tags!
    req.body.blog.body = req.sanitize(req.body.blog.body);
    Blog.create(req.body.blog, function(err, newBlog) {
       if(err) {
           res.render("new"); 
       } else {
           // then, redirect to the index
           res.redirect("/blogs");
       }
    });
    
});

// SHOW ROUTE
app.get("/blogs/:id", isLoggedIn , function(req, res) {
   Blog.findById(req.params.id, function(err, foundBlog) { //2 params: id, and callback
       if (err) {
           res.redirect("/blogs");
       } else {
           res.render("show", {blog: foundBlog}); //inside the show template, foundBlog is equal to blog
       }
   });
});

// EDIT ROUTE
app.get("/blogs/:id/edit", isLoggedIn, function(req, res) {
    Blog.findById(req.params.id, function(err, foundBlog) {
        if (err) {
            res.redirect("/blogs"); 
        } else {
            res.render("edit", {blog: foundBlog});
        }
    });
}); 

// UPDATE ROUTE
app.put("/blogs/:id", isLoggedIn, function(req, res) {
    //this bottom line basically gets rid of all <script> tags!
    req.body.blog.body = req.sanitize(req.body.blog.body);
    // Use req.body to see everything that is in the input
   Blog.findByIdAndUpdate(req.params.id, req.body.blog, function(err, updatedBlog) {
       if (err) {
           res.redirect("/blogs"); 
       } else {
           res.redirect("/blogs/" + req.params.id)
       }
   });
});






// DESTROY ROUTE
app.delete("/blogs/:id", isLoggedIn,  function(req, res) {
   //destroy blog
  Blog.findByIdAndRemove(req.params.id, function(err) {
      if (err) {
          console.log(err); 
          res.redirect("/blogs"); 
      } else {
          res.redirect("/blogs"); 
      }
  });
    // Blog.findById(req.params.id, function(err, blog) {
    //     if(err) {
    //         console.log(err); 
    //     } else {
    //         blog.remove();
    //         res.redirect("/blogs"); 
    //     }
    // });
});

// SIGNUP ROUTES
app.get("/signup", function(req, res) {
    res.render("signup");
})

app.post("/signup", function(req, res){
    var newUser = new User({username : req.body.username, email: req.body.email, number: req.body.number});
    
        User.register(newUser, req.body.password, function(err, user){
        if(err)
        {
            console.log(err);
            return res.render("signup");
        }
        else
        {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/blogs");
            });
        }
    });
});


//LOGIN ROUTES

app.get("/login", function(req, res) {
    res.render("login");
});


app.post("/login", passport.authenticate("local", 
{
    successRedirect : "/blogs",
    failureRedirect : "/login"
}), function(req, res){
    
});

app.get("/logout", function(req, res) {
    req.logout();
    res.redirect("/blogs");
});

function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/login");
}




app.listen(process.env.PORT, process.env.IP, function() {
    console.log("SERVER IS RUNNING!"); 
});
