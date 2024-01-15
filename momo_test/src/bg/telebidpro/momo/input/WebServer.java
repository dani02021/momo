package bg.telebidpro.momo.input;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadPoolExecutor;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import bg.telebidpro.momo.routes.Books;

public class WebServer {
    public HttpServer httpServer;

    public static Map<String, Runnable> URL_COMMANDS;

    static {
        URL_COMMANDS = new HashMap<String, Runnable>();

        URL_COMMANDS.put("/", Books.getBook());
    }

    public WebServer() throws IOException {
        httpServer = HttpServer.create(new InetSocketAddress("localhost", 8042), 0);

        ThreadPoolExecutor threadPoolExecutor = (ThreadPoolExecutor)Executors.newFixedThreadPool(10);

        // Load all routes
        Iterator commands_iterator = URL_COMMANDS.keySet().iterator();
        while(commands_iterator.hasNext()) {
            String command_route = (String) commands_iterator.next();
            Runnable runnable = URL_COMMANDS.get(command_route);

            httpServer.createContext(command_route, new WebServerContextHandler(runnable));
        }

        httpServer.setExecutor(threadPoolExecutor);
        httpServer.start();

        System.out.println(" Server started on port 8042");
    }


    /**
     * WebServerContextHandler
     */
    public class WebServerContextHandler implements HttpHandler {

        Runnable runnable;
        public WebServerContextHandler(Runnable runnable) {
            this.runnable = runnable;
        }

        @Override
        public void handle(HttpExchange httpExchange) throws IOException {
            OutputStream outputStream = httpExchange.getResponseBody();
            String html = "<html><body><h1>Hello</h1></body></html>";

            runnable.run();

            httpExchange.sendResponseHeaders(200, html.length());

            outputStream.write(html.getBytes());
            outputStream.flush();
            outputStream.close();
        }
    
        
    }
}
