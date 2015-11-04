# vim:fdm=marker

use strict;
use warnings;
use DateTime;
use File::Temp qw(tempfile);
use Test::More;
use Try::Tiny;

# {{{ Helper functions
sub timeEq {
  my ($d1, $d2, $delta) = @_;
  defined($delta) or $delta = 1;
  return abs(($d1 - $d2)->in_units('seconds')) < $delta;
}
# }}}

require_ok('YJournal::Item');

# {{{ New note with default attributes
{
  my $item = YJournal::Item->new();
  ok $item->id ne '', "New note has non-empty id";
  ok $item->content eq '', "New note has empty content";
  ok timeEq($item->time, DateTime->now()), "New note has correct update time";
}
# }}}
# {{{ New note with given content
{
  my $content = 'test content';
  my $item = YJournal::Item->new(content => $content);
  ok $item->content eq $content, "Note has given content";
}
# }}}
# {{{ Item CRUD
{
  my $content = "test content";
  my ($f, $dbname) = tempfile(SUFFIX => '.db');
  close $f;
  my $dbh = DBI->connect("dbi:SQLite:dbname=$dbname");
  $dbh->{sqlite_unicode} = 1;
  YJournal::Content::init($dbh);
  YJournal::Item::init($dbh);
  YJournal::Attribute::init($dbh);

  my $item = YJournal::Item::create($dbh, content => $content);
  ok $item->content eq $content, "Created has given content";

  my $loaded = YJournal::Item::retrieve($dbh, $item->id);
  ok $loaded->id eq $item->id, "Loaded has same id";
  ok $loaded->time == $item->time, "Loaded has same time";
  ok $loaded->content eq $item->content, "Loaded has same content";

  my $newContent = "new content";
  YJournal::Item::update($dbh, $item->id, $newContent);
  my $updated = YJournal::Item::retrieve($dbh, $item->id);
  ok $updated->content eq $newContent, "Updated content";

  my $deleted = YJournal::Item::delete($dbh, $item->id);
  ok $deleted, "Note deleted";
  try {
    YJournal::Item::retrieve($dbh, $item->id);
    ok 0, "Note shouldn't exist";
  } catch {
    ok 1, "Note shouldn't exist";
  };

  $dbh->disconnect;
  unlink $dbname;
}
# }}}

done_testing();
