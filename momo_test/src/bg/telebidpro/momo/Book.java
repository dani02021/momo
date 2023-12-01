package bg.telebidpro.momo;

import org.json.simple.JSONObject;
import static bg.telebidpro.momo.Assert.*;

public class Book {
    private String author;
    private String name;
    private String isbn;
    private String genre;

    public Book(String author, String name, String isbn, String genre) throws AssertException {
        ASSERT(author != null, "Author is null");
        ASSERT(name != null, "Name is null");
        ASSERT(isbn != null, "ISBN is null");
        ASSERT(genre != null, "Genre is null");

        this.author = author;
        this.name = name;
        this.isbn = isbn;
        this.genre = genre;
    }

    public JSONObject toJSONObject() {
        JSONObject book = new JSONObject();

        book.put("author", author);
        book.put("name", name);
        book.put("isbn", isbn);
        book.put("genre", genre);

        return book;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getIsbn() {
        return isbn;
    }

    public void setIsbn(String isbn) {
        this.isbn = isbn;
    }

    public String getGenre() {
        return genre;
    }

    public void setGenre(String genre) {
        this.genre = genre;
    }
}
