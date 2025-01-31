// const express = require('express');
// const mongoose = require('mongoose');
// const bcrypt = require('bcrypt');
// const cors = require('cors');
// const app = express();

// app.use(cors({
//     origin: 'http://localhost:3000',
//     credentials: true
// }));

// app.use(express.json());

// mongoose.connect('mongodb://127.0.0.1:27017/Main_Blog', {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
// }).then(() => console.log('Connected to MongoDB'))
//   .catch(err => console.error('Could not connect to MongoDB:', err));

// // User schema and model
// const UserSchema = new mongoose.Schema({
//     username: { type: String, required: true, unique: true },
//     password: { type: String, required: true },
// });

// const User = mongoose.model('User', UserSchema);

// // Blog schema and model
// const BlogSchema = new mongoose.Schema({
//     blogName: { type: String, required: true },
//     author: { type: String, required: true },
//     theme: { type: String, required: true },
//     information: { type: String, required: true },
//     url: { type: String },
//     subscribers: [{ type: String }] 
// });

// const Blog = mongoose.model('Blog', BlogSchema);

// // Register user
// app.post('/register', async (req, res) => {
//     const { username, password } = req.body;

//     try {
//         const existingUser = await User.findOne({ username });
//         if (existingUser) {
//             return res.status(400).json({ message: 'Username already exists' });
//         }

//         const hashedPassword = await bcrypt.hash(password, 10);
//         const newUser = new User({ username, password: hashedPassword });
//         await newUser.save();

//         res.status(200).json({ message: 'Registration successful' });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Registration failed' });
//     }
// });

// // Login user
// app.post('/login', async (req, res) => {
//     const { username, password } = req.body;

//     try {
//         const user = await User.findOne({ username });
//         if (!user) {
//             return res.status(500).json({ message: 'User not found' });
//         }

//         const isPasswordValid = await bcrypt.compare(password, user.password);
//         if (!isPasswordValid) {
//             return res.status(400).json({ message: 'Invalid Password' });
//         }

//         // Send the username along with success message
//         res.status(200).json({
//             message: 'Login Successful',
//             username: user.username // Send username in response
//         });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Login Failed' });
//     }
// });

// // Create Blog
// app.post('/create-blog', async (req, res) => {
//     const { blogName, author, theme, information, url } = req.body;

//     try {
//         const newBlog = new Blog({ blogName, author, theme, information, url });
//         await newBlog.save();
//         res.status(200).json({ message: 'Blog created successfully' });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: 'Failed to create blog' });
//     }
// });

// app.get('/my-blogs', async (req, res) => {
//     const { username } = req.query; // Retrieve the username from query params
  
//     try {
//       const blogs = await Blog.find({ author: username }); // Find blogs by the author
//       res.status(200).json(blogs);
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ message: 'Error fetching blogs' });
//     }
//   });
  
//   app.get('/all-blogs', async (req, res) => {
//     try {
//       const blogs = await Blog.find(); // Fetch all blogs from the database
//       res.status(200).json(blogs);
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ message: 'Error fetching blogs' });
//     }
//   });
  
//   app.post('/toggle-subscribe', async (req, res) => {
//     const { blogId, username } = req.body;
  
//     try {
//       const blog = await Blog.findById(blogId);
//       if (!blog) {
//         return res.status(404).json({ message: 'Blog not found' });
//       }
  
//       const isSubscribed = blog.subscribers.includes(username);
  
//       if (isSubscribed) {
//         blog.subscribers = blog.subscribers.filter(subscriber => subscriber !== username);
//       } else {
//         blog.subscribers.push(username);
//       }
  
//       await blog.save();
  
//       res.status(200).json({ 
//         message: isSubscribed ? 'Unsubscribed successfully' : 'Subscribed successfully',
//         subscribers: blog.subscribers 
//       });
  
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ message: 'Subscription toggle failed' });
//     }
//   });
  

// app.listen(4000, () => {
//     console.log('Server is running on port http://localhost:4000');
// });



const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const nodemailer=require('nodemailer');
const jwt = require('jsonwebtoken'); // Importing jsonwebtoken for handling JWT
const app = express();

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());  // To read cookies sent by the client

mongoose.connect('mongodb://127.0.0.1:27017/Blog_App', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

// User schema and model
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});

const User = mongoose.model('User', UserSchema);

// Blog schema and model
const BlogSchema = new mongoose.Schema({
    blogName: { type: String, required: true },
    author: { type: String, required: true },
    theme: { type: String, required: true },
    information: { type: String, required: true },
    url: { type: String },
    subscribers: [{ type: String }],
    comments: [{ username: String, text: String, timestamp: Date }]
});

const Blog = mongoose.model('Blog', BlogSchema);
const SubscriptionSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    dateSubscribed: { type: Date, default: Date.now },
  });
  
  const Subscription = mongoose.model('Subscription', SubscriptionSchema);

// Authentication middleware
const authenticate = (req, res, next) => {
    const token = req.cookies.token; // Get token from cookies
    if (!token) {
        return res.status(401).json({ message: 'Not authorized' });
    }
    try {
        const decoded = jwt.verify(token, 'your_jwt_secret'); // Verify JWT token
        req.user = decoded; // Attach decoded user info to the request object
        next();
    } catch (err) {
        return res.status(400).json({ message: 'Invalid token' });
    }
};

// Register user
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();

        res.status(200).json({ message: 'Registration successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Registration failed' });
    }
});

// Login user
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(500).json({ message: 'User not found' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid Password' });
        }

        // Generate JWT token and send it as a cookie
        const token = jwt.sign({ username: user.username }, 'your_jwt_secret', { expiresIn: '1h' });
        res.cookie('token', token, { httpOnly: true, secure: false }); // secure: true if using https

        res.status(200).json({
            message: 'Login Successful',
            username: user.username // Send username in response
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Login Failed' });
    }
});

// Create Blog
app.post('/create-blog', async (req, res) => {
    const { blogName, author, theme, information, url } = req.body;

    try {
        const newBlog = new Blog({ blogName, author, theme, information, url });
        await newBlog.save();
        res.status(200).json({ message: 'Blog created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to create blog' });
    }
});

// Fetch blogs created by a specific user
app.get('/my-blogs', async (req, res) => {
    const { username } = req.query;
  
    try {
      const blogs = await Blog.find({ author: username });
      res.status(200).json(blogs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error fetching blogs' });
    }
});
  
// Fetch all blogs
app.get('/all-blogs', async (req, res) => {
    try {
      const blogs = await Blog.find(); // Fetch all blogs from the database
      res.status(200).json(blogs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Error fetching blogs' });
    }
});
  
// Subscribe/Unsubscribe from a blog
app.post('/toggle-subscribe', async (req, res) => {
    const { author, username } = req.body;

    try {
        // Find all blogs of the given author
        const blogs = await Blog.find({ author });

        if (blogs.length === 0) {
            return res.status(404).json({ message: 'No blogs found for this author' });
        }

        // Check if the user is already subscribed to any of the author's blogs
        const isSubscribed = blogs.some(blog => blog.subscribers.includes(username));

        // Update subscription status for all blogs of that author
        for (const blog of blogs) {
            if (isSubscribed) {
                blog.subscribers = blog.subscribers.filter(subscriber => subscriber !== username);
            } else {
                blog.subscribers.push(username);
            }
            await blog.save();
        }

        res.status(200).json({ 
            message: isSubscribed ? 'Unsubscribed from all blogs of this author' : 'Subscribed to all blogs of this author',
            subscribers: blogs[0].subscribers 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Subscription toggle failed' });
    }
});

app.post('/add-comment', async (req, res) => {
    const { blogId, username, text } = req.body;

    try {
        const blog = await Blog.findById(blogId);
        if (!blog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        const newComment = { username, text, timestamp: new Date() };
        blog.comments.push(newComment);
        await blog.save();

        res.status(200).json({ message: 'Comment added successfully', comments: blog.comments });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to add comment' });
    }
});

app.get('/profile', async (req, res) => {
        const { username } = req.query;
    
        try {
            const userBlogs = await Blog.find({ author: username });
            const totalSubscribers = userBlogs.reduce((acc, blog) => acc + blog.subscribers.length, 0);
    
            res.status(200).json({
                username,
                totalBlogs: userBlogs.length,
                totalSubscribers
            });
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'Error fetching profile data' });
        }
    });

app.post('/edit-profile', async (req, res) => {
    const { currentUsername, newUsername, newPassword } = req.body;

    // Validate request body
    if (!currentUsername) {
        return res.status(400).json({ message: "Current username is required" });
    }

    // Try to find the user
    try {
        const user = await User.findOne({ username: currentUsername });

        // If user does not exist, return an error
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if new username is provided and validate if it is already taken
        if (newUsername) {
            const usernameExists = await User.findOne({ username: newUsername });
            if (usernameExists) {
                return res.status(400).json({ message: "Username already taken" });
            }
            user.username = newUsername;  // Update username
        }

        // Check if new password is provided, hash it, and update
        if (newPassword) {
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            user.password = hashedPassword;  // Update password with hashed value
        }

        // Save the updated user profile
        await user.save();

        // Respond with success message
        res.status(200).json({
            message: "Profile updated successfully",
            username: newUsername || currentUsername, // Return the updated or current username
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Profile update failed" });
    }
});

// Delete User Profile
app.post('/delete-profile', async (req, res) => {
    const { username } = req.body;  // Getting username from the request body

    try {
        const user = await User.findOneAndDelete({ username });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Optionally, delete the user's blogs as well
        await Blog.deleteMany({ author: username });

        res.status(200).json({ message: 'Profile deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Profile deletion failed' });
    }
});

// Logout route
app.post('/logout', authenticate, (req, res) => {
    // Clear the JWT token from the client-side cookies
    res.clearCookie('token'); 
    res.status(200).json({ message: 'Logged out successfully' });
});
app.put('/update-blog/:id', async (req, res) => {
    const { id } = req.params; // Get the blog ID from the URL
    const { blogName, author, theme, information, url } = req.body;

    try {
        const updatedBlog = await Blog.findByIdAndUpdate(id, {
            blogName, author, theme, information, url
        }, { new: true });

        if (!updatedBlog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        res.status(200).json(updatedBlog);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update blog' });
    }
});
// Delete Blog endpoint
app.delete('/delete-blog/:id', async (req, res) => {
    const { id } = req.params; // Get the blog ID from the URL

    try {
        const deletedBlog = await Blog.findByIdAndDelete(id);

        if (!deletedBlog) {
            return res.status(404).json({ message: 'Blog not found' });
        }

        res.status(200).json({ message: 'Blog deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete blog' });
    }
});

const transporter1 = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'karpagammaheswari12@gmail.com',
      pass: 'xitd hufd ncyg zkuk',
    },
  });
  
  // Second transporter configuration (new email)
  const transporter2 = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'karpagammaheswari12@gmail.com',
      pass: 'xitd hufd ncyg zkuk',
    },
  });
  
  const sendNotificationEmail = (email, transporter) => {
    const mailOptions = {
      from:"karpagammaheswari12@gmail.com",  
      to: email,  
      subject: 'Thank You for Subscribing!',
      text: 'Thank you for subscribing to our blog! We are thrilled to have you join our community. 🎉You will receive updates from us soon, including the latest posts, exclusive content, and more. In the meantime, feel free to visit our [website/blog] to explore our previous posts and get a sneak peek of what’s to come.If you have any questions or suggestions, dont hesitate to reach out. We’re here to make your reading experience enjoyable and enriching. ',
    };
  
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log('Error sending email:', error);
        } else {
          console.log('Email sent:', info.response);
        }
      });
    };
    
    // Subscription route
    app.post('/subscribe', async (req, res) => {
      const { email } = req.body;
    
      try {
        const existingSubscription = await Subscription.findOne({ email });
        if (existingSubscription) {
          return res.status(400).json({ message: 'Email already subscribed' });
        }
    
        const newSubscription = new Subscription({ email });
        await newSubscription.save();
    
        sendNotificationEmail(email, transporter1);  
        res.status(200).json({ message: 'Subscription successful' });
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Subscription failed' });
      }
    });
    
app.listen(4000, () => {
    console.log('Server is running on port http://localhost:4000');
});


