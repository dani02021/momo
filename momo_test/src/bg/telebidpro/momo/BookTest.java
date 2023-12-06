package bg.telebidpro.momo;

import org.json.simple.JSONObject;
import org.junit.Before;
import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static bg.telebidpro.momo.error.Assert.*;

public class BookTest {

    private Book book;

    @Before
    public void setUp() throws AssertException {
        book = new Book("Momo", "test test", "Suobshtenie ot", "prezidenta");
    }

    @Test
    public void testName() {
        book.setName("Gustavo");

        assertEquals("Does not equal", book.getName(), "Gustavo");
    }

    @Test
    public void testJSONObject() {
        JSONObject bookObj = book.toJSONObject();

        assertEquals("Does not equal", bookObj.get("author"), book.getAuthor());
        assertEquals("Does not equal", bookObj.get("name"), book.getName());
        assertEquals("Does not equal", bookObj.get("isbn"), book.getIsbn());
        assertEquals("Does not equal", bookObj.get("genre"), book.getGenre());
    }

    @Test
    public void testISBN() {
        book.setIsbn("Gus");

        assertEquals("Does not equal", book.getIsbn(), "Gus");
    }

    @Test
    public void testGenre() {
        book.setGenre("Amonguz");
        assertEquals("Does not equal", book.getGenre(), "Amonguz");
    }

    @Test
    public void testAuthor() {
        book.setAuthor("AmonGus");
        assertEquals("Does not equal", book.getAuthor(), "AmonGus");
    }
}
