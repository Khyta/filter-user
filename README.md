This app is for moderators to add/remove users to a filter rule. Moderators only
need to add or remove the users from the list by using the buttons in the
comment interface. The app will automatically update the filter rule and add or
remove users from it. The backend used to store the users is redis.

# Features

- Add users to the filter rule
- Remove users from the filter rule
- Check when the last time the filter rule for that specific user was
  updated. This is supported both through an additional button in the comment
  interface and through the user notes.

# Usecase

This app is useful for subreddits where moderators want to keep an eye on
certain users. The idea behind this app is to make it easier for moderators to
manage the filter rule without actually having to manually edit the automoderator
config file where filtering users is also possible.