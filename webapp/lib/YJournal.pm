package YJournal;
use Dancer ':syntax';
use Dancer::Plugin::REST;
use Dancer::Plugin::Database;
use YJournal::DB;
use YJournal::Item;

our $VERSION = '0.1';

prepare_serializer_for_format;

my $dbh = YJournal::DB::init();

get '/' => sub {
    template 'index';
};

post '/api/item.:format' => sub {
  my ($ret, $error) = YJournal::Item::create($dbh, content => params->{content});
  defined($error)
    and send_error $error
    or return $ret;
};

get '/api/item/:id.:format' => sub {
  my ($ret, $error) = YJournal::Item::retrieve($dbh, params->{id});
  defined($error)
    and send_error $error
    or return $ret;
};

put '/api/item/:id.:format' => sub {
  my ($ret, $error) = YJournal::Item::update($dbh, params->{id}, params->{content});
  defined($error)
    and send_error $error
    or return $ret;
};

del '/api/item/:id.:format' => sub {
  my ($ret, $error) = YJournal::Item::delete($dbh, params->{id});
  defined($error)
    and send_error $error
    or return $ret;
};

get '/api/items.:format' => sub {
  my ($ret, $error) = YJournal::Item::query($dbh);
  defined($error)
    and send_error $error
    or return $ret;
};

true;
