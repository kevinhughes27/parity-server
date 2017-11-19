package io.masse.parityleaguestats.model;


import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class Game implements Serializable {

    private List<Point> points;

    public Game() {
        points = new ArrayList<Point>();
    }

    public void addPoint(Point point) {
        points.add(point);
    }

    public int getPointCount() {
        return points.size();
    }

    public Point popPoint() {
        if (points.size() > 0) {
            int lastPointIdx = points.size() - 1;
            Point lastPoint = points.get(lastPointIdx);

            points.remove(lastPointIdx);

            return lastPoint;
        }
        return null;
    }
}
