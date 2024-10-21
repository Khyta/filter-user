# About

This app is for moderators to add/remove users to an automod filter rule.
Moderators only need to add or remove the users from the list by using the
buttons in the comment interface. The app will automatically update the automod
filter rule and create a "Managed" YAML block in the config.

> ⚠️ **Warning:**  Do not touch this managed block. It's fine to update ruels
> surrounding it, but do not modify the block and the comments marking it as a
> managed block. Doing so will break the app and the automod filter rule.

You do not need to create the managed block in the config. The app will create
it for you if it does not exist yet.

# Features

- Add users to the automod filter rule
- Remove users from the automod filter rule
- Check when the last time the automod filter rule for that specific user was
  updated. This is supported both through an additional button in the comment
  interface and through the user notes.
- Remove the managed block from the config when there is no user left in the
  list

# Usecase

This app is useful for subreddits where moderators want to keep an eye on
certain users. The idea behind this app is to make it easier for moderators to
manage the automod filter rule without actually having to manually edit the
config file.