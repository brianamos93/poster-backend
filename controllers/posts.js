const postsRouter = require('express').Router()
const jwt = require('jsonwebtoken')
const Post = require('../models/post')
const User = require('../models/user')

const getTokenFrom = request => {
	const authorization = request.get('authorization')
	if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
		return authorization.substring(7)
	}
	return null
}

postsRouter.get('/', async (req, res) => {
	const posts = await Post
		.find({}).populate('user', { username: 1, title: 1 })
	res.json(posts)
})

postsRouter.get('/:id', async (req, res) => {
	const post = await Post.findById(req.params.id)
	if (post) {
		res.json(post)
	} else {
		res.status(404).end()
	}
})

postsRouter.post('/', async (req, res) => {
	const body = req.body
	const token = getTokenFrom(req)
	const decodedToken = jwt.verify(token, process.env.SECRET)
	if(!decodedToken.id) {
		return res.status(401).json({ error: 'token missing or invalid' })
	}
	const user = await User.findById(decodedToken.id)

	const post = new Post({
		title: body.title,
		user: user._id
	})

	const savedPost = await post.save()
	user.posts = user.posts.concat(savedPost._id)
	await user.save()

	res.json(savedPost)

})

postsRouter.delete('/:id', async (req, res) => {
	const token = getTokenFrom(req)
	const decodedToken = jwt.verify(token, process.env.SECRET)
	const postsearch = await Post.findById(req.params.id, { _id: 0, user: 1 }).exec()
	const postuserid = postsearch.user.toString()
	const userid = decodedToken.id
	if (postuserid === userid) {
		await Post.findByIdAndRemove(req.params.id)
		res.status(204).end()
	} else if (!decodedToken.id) {
		return res.status(401).json({ error: 'token missing or invalid' })
	} else if (postsearch.user === null) {
		return res.status(401).json({ error: 'Post does not exist.' })
	} else {
		return res.status(401).json({ error: 'Error' })
	}
})

postsRouter.put('/:id', (req, res, next) => {
	const body = req.body

	const post = {
		title: body.title
	}

	Post.findByIdAndUpdate(req.params.id, post, { new: true })
		.then(updatedPost => {
			res.json(updatedPost)
		})
		.catch(error => next(error))
})

module.exports = postsRouter