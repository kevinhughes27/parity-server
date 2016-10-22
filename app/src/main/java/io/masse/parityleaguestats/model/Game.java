package io.masse.parityleaguestats.model;


import java.util.ArrayList;
import java.util.List;

public class Game {

    private List<Point> points;

    public Game() {
        points = new ArrayList<Point>();
    }

    public void addPoint(Point point) {
        points.add(point);
    }
}
