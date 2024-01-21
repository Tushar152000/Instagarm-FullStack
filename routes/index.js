var express = require("express");
var router = express.Router();
const userModel = require("./users");
const postModel=require("./posts");

const passport = require("passport");
const localStrategy = require("passport-local");
const upload = require("./multer");
const posts = require("./posts");

passport.use(new localStrategy(userModel.authenticate()));

router.get("/", function (req, res) {
  res.render("index", { footer: false });
});

router.get("/login", function (req, res) {
  res.render("login", { footer: false });
});

router.get("/feed", isLoggedIn, async function (req, res) {
  const user=await userModel.findOne({username:req.session.passport.user});
  const posts=await postModel.find().populate("user");
  console.log(posts);
  res.render("feed", { footer: true,posts,user});
});

router.get("/profile", isLoggedIn, async function (req, res) {
  const user= await userModel.findOne({username:req.session.passport.user}).populate("posts");
  res.render("profile", { footer: true ,user});
});

router.get("/search", isLoggedIn, function (req, res) {
  res.render("search", { footer: true });
});

router.get("/edit", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("edit", { footer: true, user });
});
router.get("/like/post/:id", isLoggedIn, async function(req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const post = await postModel.findOne({ _id: req.params.id });

  if (!post) {
    // Handle the case where the post is not found
    return res.status(404).send("Post not found");
  }

  console.log("Post:", post);  // Log the post object to check its structure

  if (!post.likes || !Array.isArray(post.likes)) {
    // If post.likes is not defined or not an array, initialize it as an empty array
    post.likes = [];
  }

  console.log("Likes:", post.likes);  // Log the likes array to check its content

  // Check if user has already liked the post
  const userIndex = post.likes ? post.likes.indexOf(user._id) : -1;

  console.log("User Index:", userIndex);  // Log the userIndex to check its value

  // Toggle the like status
  if (userIndex === -1) {
    // If user has not liked, add the like
    post.likes.push(user._id);
  } else {
    // If user has liked, remove the like
    post.likes.splice(userIndex, 1);
  }

  await post.save();
  res.redirect("/feed");
});


router.get("/username/:username", isLoggedIn, async function (req, res) {
  try {
    const regex = new RegExp(`^${req.params.username}`, 'i');
    const users = await userModel.find({ username: regex });
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


router.get("/upload", isLoggedIn, function (req, res) {
  res.render("upload", { footer: true });
});
router.post("/upload",upload.single('image'),async function(req,res){
  const user=await userModel.findOne({username:req.session.passport.user});
  const post= await postModel.create({
    picture:req.file.filename,
    user:user._id,
    caption: req.body.caption
  })
user.posts.push(post._id);
await user.save();
res.redirect("/feed");



})
router.post("/register", function (req, res) {
  const userData = new userModel({
    username: req.body.username,
    name: req.body.name,
    email: req.body.email,
  });
  userModel.register(userData, req.body.password).then(function () {
    passport.authenticate("local")(req, res, function () {
      res.redirect("/profile");
    });
  });
});
router.post("/login",passport.authenticate("local", {
    successRedirect: "/profile",
    failureRedirect: "/login",
  }),
  function (req, res) {}
);
router.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/login");
  });
});
router.post("/update", upload.single("image"), async function (req, res) {
  const user = await userModel.findOneAndUpdate(
    { username: req.session.passport.user},
    { username: req.body.username, name: req.body.name, bio: req.body.bio },
    { new: true }
  );
  if(req.file){
    user.profileImage = req.file.filename;
  }

  await user.save();
  res.redirect("/profile");
});
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}
module.exports = router;
