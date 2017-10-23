package io.masse.parityleaguestats;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Typeface;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import java.util.ArrayList;

import io.masse.parityleaguestats.customLayout.customLinearLayout;
import io.masse.parityleaguestats.model.Team;
import io.masse.parityleaguestats.model.Teams;

public class Roster extends Activity {
    private customLinearLayout layoutLeft;
    private customLinearLayout layoutRight;
    private TextView leftTeamName, rightTeamName, leftScore, rightScore;
    private View.OnClickListener toggleUserListener;
    private Context context;

    private Teams teams;
    private Team leftTeam;
    private Team rightTeam;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_roster);
        context = this;

        teams = (Teams)this.getIntent().getSerializableExtra("teams");
        leftTeam = (Team)this.getIntent().getSerializableExtra("leftTeam");
        rightTeam = (Team)this.getIntent().getSerializableExtra("rightTeam");

        leftTeamName = (TextView) findViewById(R.id.leftTeam);
        rightTeamName = (TextView) findViewById(R.id.rightTeam);
        leftScore = (TextView) findViewById(R.id.leftScore);
        rightScore = (TextView) findViewById(R.id.rightScore);

        layoutLeft = (customLinearLayout) findViewById(R.id.layoutLeftNames);
        layoutRight = (customLinearLayout) findViewById(R.id.layoutRightNames);

        toggleUserListener = new View.OnClickListener(){
            @Override
            public void onClick(View view){
                Button currentButton = (Button) view;
                if (currentButton.getTypeface()!=null) {
                    currentButton.setTypeface(null, Typeface.NORMAL);
                } else {
                    currentButton.setTypeface(null, Typeface.BOLD);
                }
            }
        };

        leftTeamName.setText(leftTeam.name);
        Utils.draw_players(context, layoutLeft, toggleUserListener, leftTeam, true);

        rightTeamName.setText(rightTeam.name);
        Utils.draw_players(context, layoutRight, toggleUserListener, rightTeam, false);

        final Button doneButton = (Button) findViewById(R.id.btnDone);
        doneButton.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                toggleRoster();
            }
        });
    }

    @Override
    public void onPause(){
        super.onPause();
    }

    @Override
    public void onBackPressed() {
        // Do nothing;
    }

    private void toggleRoster() {
        int leftCount = layoutLeft.getChildCount();
        int rightCount = layoutRight.getChildCount();

        int leftVisible = 0;
        int rightVisible = 0;

        for (int i = 0; i < leftCount; i++) {
            Button currentButton = (Button) layoutLeft.getChildAt(i);
            if (currentButton.getTypeface() != null)
                leftVisible++;
        }
        for (int i = 0; i < rightCount; i++) {
            Button currentButton = (Button) layoutRight.getChildAt(i);
            if (currentButton.getTypeface() != null)
                rightVisible++;
        }

        int teamSize = 6;

        boolean leftCorrectNumPlayers = leftVisible == teamSize;
        boolean rightCorrectNumPlayers = rightVisible == teamSize;

        if (leftCorrectNumPlayers && rightCorrectNumPlayers) {

            ArrayList<String> leftPlayers = leftTeam.getPlayers();
            ArrayList<String> rightPlayers = rightTeam.getPlayers();

            for (int i = 0; i < leftCount; i++) {
                Button currentButton = (Button) layoutLeft.getChildAt(i);
                if (currentButton.getTypeface() != null) {
                    String playerName = currentButton.getText().toString();
                    leftPlayers.add(playerName);
                }
            }
            for (int i = 0; i < rightCount; i++) {
                Button currentButton = (Button) layoutRight.getChildAt(i);
                if (currentButton.getTypeface() != null) {
                    String playerName = currentButton.getText().toString();
                    rightPlayers.add(playerName);
                }
            }

            Intent intent = new Intent(context, Stats.class);
            Bundle bundle = new Bundle();
            bundle.putSerializable("teams", teams);
            bundle.putSerializable("leftTeam", leftTeam);
            bundle.putSerializable("leftPlayers", leftPlayers);
            bundle.putSerializable("rightTeam", rightTeam);
            bundle.putSerializable("rightPlayers", rightPlayers);
            intent.putExtras(bundle);
            startActivity(intent);

        } else {
            String error = "Incorrect number of players";
            if (!leftCorrectNumPlayers) {
                error += String.format("\nLeft side: %d/%d selected", leftVisible, teamSize);
            }

            if (!rightCorrectNumPlayers) {
                error += String.format("\nRight side: %d/%d selected", rightVisible, teamSize);
            }

            Toast.makeText(context, error, Toast.LENGTH_LONG).show();
            return;
        }
    }
}
