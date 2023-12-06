package bg.telebidpro.momo;

import bg.telebidpro.momo.input.InputType;
import bg.telebidpro.momo.input.Konsole;

import java.io.File;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.HashMap;
import java.util.Scanner;
import java.util.function.Function;

// Press Shift twice to open the Search Everywhere dialog and type `show whitespaces`,
// then press Enter. You can now see whitespace characters in your code.
public class Main {
    public static Bookshelf bookshelf;
    public static File booksFile = new File("./books.json");
    public static Connection conn;
    public static Scanner scanner;
    public static HashMap<Integer, Function> KONSOLE_COMMAND_TABLE = new HashMap<Integer, Function>() {{
        put(1, Konsole::addBook);
        put(2, Konsole::getBook);
    }};

    public static void main(String[] args) {
        while (true) {
        try {
            if(conn == null) {
                Class.forName("org.postgresql.Driver");
                conn = DriverManager
                        .getConnection("jdbc:postgresql://localhost:5432/momcho",
                                "momo", "momo");
            }

            if(bookshelf == null) {
                bookshelf = new Bookshelf(conn);
            }

            if(scanner == null) {
                scanner = new Scanner(System.in);
            }

            Konsole konsole = new Konsole(scanner, bookshelf, getKonsoleCommands());

            konsole.printHelpMessage(System.out);

            while (true) {
                int action = konsole.waitForInput(Konsole.InputType.INTEGER);

                konsole.runAction(action);
            }
        } catch(Exception e) {
            System.err.println("DID YOU BREAK ME!!");
            e.printStackTrace();
        }
        }
    }

    private static HashMap getKonsoleCommands() {
    }
}