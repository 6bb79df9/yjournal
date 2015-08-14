package YJournal::DB;

use strict;
use warnings;
use DBI;

sub init {
  my $dbname = shift || "yjournal.db"; 

  my $dbh = DBI->connect("dbi:SQLite:dbname=$dbname", "", "")
    or confess ("Couldn't open database '$dbname':" . $DBI::errstr);
  $dbh->{sqlite_unicode} = 1;

  # Journal item table
  $dbh->do(q{
    CREATE TABLE IF NOT EXISTS item (
      id TEXT NOT NULL UNIQUE,
      time TEXT NOT NULL,
      cid TEXT NOT NULL
    );
    }) or confess ("Couldn't create item table:" . $dbh->errstr);

  # Journal content table
  $dbh->do(q{
    CREATE TABLE IF NOT EXISTS content (
      id TEXT NOT NULL UNIQUE,
      content BLOB NOT NULL
    );
    }) or confess ("Couldn't create content table:" . $dbh->errstr);

  # Journal attribute table
  $dbh->do(q{
    CREATE TABLE IF NOT EXISTS attribute (
      id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      value BLOB NOT NULL,
      PRIMARY KEY (id, name)
    );
    }) or confess ("Couldn't create attribute table" . $dbh->errstr);

  return $dbh;
}

1;
