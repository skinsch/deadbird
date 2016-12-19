# Deadbird
Save deleted tweets of Twitter users.

### Setup
1. Create a MySQL user with read/write permissions and update `settings.json` with your db login information (Assuming your user, pass, and db is `deadbird` from here on)
2. Create a new database called `deadbird`.
3. Import `deadbird.sql` into your new db by running this from the command line `mysql -u deadbird -pdeadbird -D deadbird < deadbird.sql`.
4. Run `npm install` to fetch Deadbird's dependencies.
5. Run `gulp` to minify ejs templates and transpile js.
6. (optional) If your fetchers keeps timing out even with low values, you might want to adjust your `ulimit nofile` settings. You can read more about how to set this up (for Ubuntu at least) [here](http://posidev.com/blog/2009/06/04/set-ulimit-parameters-on-ubuntu/). 

### Running
Start up the Deadbird server by running `npm start`. This'll start the web server on port 3000 and the socket.io server on port 8080. All of the fetchers will be running in the background at the intervals specified in `settings.json`.

### Available fetchers and helper scripts
##### Fetcher
###### Fetchers the last ~20 tweets from a user's timeline and inserts new tweets into into the database.
- Runs with a delay of 0 by default (`fetcherRestInterval`).
- Delay should be 0 or very low to ensure that as many tweets can be fetched as possible.
- Depending on how much traffic your internet connection can handle, you should limit the number of users you are tracking. If you track too many users, it'll take longer for the fetcher to check everyone and it might be possible that someone could have tweeted something and instantly deleted it before being detected by the fetcher.

##### Checker
###### Checks tweets from within the last 7 days. Sees if we get a 200 status code to determine if the tweet still exists.
- Runs with a delay of 900 by default (`checkerRestInterval`).
- It isn't necessary for the checker to run continuously since a tweet can be checked for deletion at any time, however, the deletion date will be inaccurate.
- Checks tweets that were made within the last 7 days. If you want to check tweets older than 7 days, you can run the checker manually by providing an argument to the checker with the number of days back you want to check. `node checker 1000` - check tweets that are up to a 1,000 days old.

##### GetTemplate
###### Updates the user profile pictures and profile pages containing tweet/follower count, bio, header image, etc.
- Runs daily by default (`templateRestInterval`).
- Not necessary to run as often unless you want to keep up to date profile pics and twitter page bio/stats.

##### Unchecker
###### Check if deleted tweets are actually still deleted.
- Very rarely, tweets may be deleted by the checker on accident.
- The unchecker will compress tweets that are actually live still and mark them as undeleted as well as update deleted tweet counts for affected users.

##### Benchmark
###### Determine optimal settings depending on your internet connection
- Benchmark will increase the number of open concurrent connections as long as the rate increases and errors occur less than 5% of the time.
- Once the 5% error rate is surpassed or the avg tweets retrieved per second doesn't increase significantly, it'll back off 2 steps to be safe.
- Next, the timeout time will be slowly lowered until the error rate surpasses 5% again and it'll back off 2 steps as well.
- By the end of the benchmark, the `settings.json` will be updated with the best values that the benchmark program was able to determine.
- Benchmark is a slow program and may take up to half an hour to complete. You can also experiment with values yourself to determine what works for you. You can also start the programming with some initial values if you want to speed up the process and are confident with your supplied values.
`node benchmark <speed> <timeout> <size>`
(default values: `node benchmark 10 3000 2000`)


### Settings
```
general
    port:                 Webserver port number
    socket:               Socket.io port number
    basehref:             Sets the base tag for absolute urls. Some links will attempt to go to twitter.com
                          unless this is updated to match your path settings.
    rate:                 Number of concurrent connections while checking/unchecking tweets
    timeout:              How long until a connection attempt times out while looking up tweets
    maxSockets:           Playing around with this number can improve performance significantly. If you are
                          getting a lot of timeout errors increase timeout and consider adjusting this value.
    retrieversEnabled:    Enable/disable fetchers
    fetcherRestInterval:  Delay until fetcher loop runs again
    checkerRestInterval:  Delay until checker loop runs again
    templateRestInterval: Delay until template loop runs again
    acceptingNewUsers:    Enable/disable new user page
    maxUsers:             Maximum number of users that can be tracked. New user page will be disabled when this
                          value is exceeded.

db
    host: MySQL host
    socketPath:        If you are using UNIX sockets, this value might be required
    username:          DB username
    password:          DB password
    database:          DB name
    keepAliveInterval: Keep DB connection open by performing basic query every x milliseconds

session
    key:    Name of session
    secret: Session secret. This value should be changed.
```
