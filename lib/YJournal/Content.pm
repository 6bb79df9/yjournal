package YJournal::Content;

use strict;
use warnings;
use Digest::MD5 qw(md5_hex);
use YJournal::DB qw(rollback);

sub save {
  my $dbh = shift;
  my $content = shift;
  my $cid = md5_hex($content);
  $dbh->do(q{
    INSERT INTO content(id, content)
    SELECT ?, ?
    WHERE NOT EXISTS(SELECT 1 FROM content WHERE ID=?);
    }, {},
    $cid,
    $content,
    $cid) or return rollback($dbh, undef, "Couldn't insert content" . $dbh->errstr);
  $cid;
}

1;
