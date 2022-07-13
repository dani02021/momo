#! /usr/bin/perl5 -w

# Open can be used for everything that has stdout or stderr
# Commands too
# But use Pipe | at the end of the cmd

while(1) {
    open ERROR_LOG, "curl -u 'admin:admin' http://10.21.9.163/logs/error.log |" or die $!;
    
    while (<ERROR_LOG>) {
        print $_;
    }
}
