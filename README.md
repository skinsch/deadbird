# Deadbird
Save deleted tweets of the top 100+ Twitter users.

### Setup
1. Create a MySQL user with read/write permissions and update `settings.json` with your db login information (Assuming your user, pass, and db is `deadbird` from here on)
2. Create a new database called `deadbird`.
3. Import `deadbird.sql` into your new db by running this from the command line `mysql -u deadbird -pdeadbird -D deadbird < deadbird.sql`.
4. Run `node getTemplate` to fetch Twitter user templates and profile pictures. You can run this command again whenever you want to update a user's template/profile pic if it changes on Twitter.

### How to run
*Eventually these two loops will be moved into the main node server loop so it'll be done automatically. For now, you'll have to run the fetcher and checker manually*

#### Fetcher
###### Fetchers the last ~20 tweets from a user's timeline and inserts it into the database/fs. 
Run the fetcher continuously by running `while true; do node fetch; done`

#### Checker
###### Checks tweets from within the last 7 days. Sees if we get a 404 or 200 status code to determine if the tweet still exists.
Run the checker continuously by running `while true; do node check; done`
