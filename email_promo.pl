#! /usr/bin/perl -wT

use DBI;
use Getopt::Std;
use Email::Sender::Simple qw(sendmail);
use Email::Simple;
use Email::Sender::Transport::SMTP::Persistent qw();
use Try::Tiny;

use strict; use warnings;

getopt('up');

# print "@ARGV\n";

our($opt_u, $opt_p);
our $dbh;

try {
    my $driver = "Pg";
    my $database = "ecommercenodejs";
    my $dsn = "DBI:$driver:dbname=$database;host=localhost;port=5432";
    my $user = defined($opt_u) ? $opt_u : die "No -u argument supplied!";
    my $pass = defined($opt_p) ? $opt_p : die "No -p argument supplied!";

    $dbh = DBI->connect($dsn, $user, $pass, { RaiseError => 1 }) or die DBI::errstr;

    # Connect to G-Mail
    my $transport = Email::Sender::Transport::SMTP::Persistent->new({
            host => 'smtp.gmail.com',
            port => 465,
            ssl => 1,
            sasl_username => 'danielgudjenev@gmail.com',
            sasl_password => 'ynimcicxhgzifbct '
    });
    
    my $stmt = q(
            SELECT
                username, email, promotions.name, token
            FROM user_vouchers
            JOIN users          ON user_vouchers."userId"  = users.id
            JOIN vouchers       ON "voucherId"             = vouchers.id
                JOIN promotions ON "promotionId"           = promotions.id
            WHERE
                    "emailSend"      = false
                AND "emailConfirmed" = true
                AND active           = false
                AND NOW() BETWEEN   promotions."startDate"
                              AND   promotions."endDate";
            );
            
    my $sth = $dbh->prepare( $stmt  );
    my $rv = $sth->execute() or die $DBI::errstr;
    
    print $DBI::errstr if $rv < 0;
    
    while (my @row = $sth->fetchrow_array()) {
        print "@row\n";
        
        my $to = $row[1];
        my $subject = 'Test E-Mail';
        my $promotion = $row[2];
        my $token = $row[3];
        my $message = "Promo: $promotion and your token is: $token";
        
        my $msg = Email::Simple->create(
            header  => [
                From    => 'danielgudjenev@gmail.com',
                To      => $to,
                Subject => 'Hey I just met you'
            ],
            body    => $message
        );
          
        sendmail(
            $msg,
            { transport => $transport }
        );
        
        print "Email Sent!\n$msg\n";
    }
} catch {
    my $sth = $dbh->prepare('INSERT INTO logs(level, message, "longMessage") VALUES (?, ?, ?);');
    my $rv = $sth->execute('error', "Error while trying to send email!", "Error while trying to send email!");

    # die "Error caught! $_";
};
